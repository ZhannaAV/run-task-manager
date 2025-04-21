import { IExecutor } from './Executor';
import ITask from './Task';

interface INode {
    value: ITask;
    next: INode | null;
}

class LinkedList {
    public enqueue(task: ITask) {
        const node = { value: task, next: null };
        if (this.tail) {
            this.tail.next = node;
            this.tail = node;
        } else {
            this.head = node;
            this.tail = node;
        }
        this.size++;
    }

    public dequeue(running: Set<number>): ITask | undefined {
        let curr = this.head;
        let prev: INode | null = null;

        while (curr && running.has(curr.value.targetId)) {
            prev = curr;
            curr = curr.next;
        }

        if (!curr) { return; }

        if (!prev) {
            this.head = curr.next;
        } else {
            prev.next = curr.next;
        }

        if (!curr.next) {
            this.tail = prev;
        }

        this.size--;
        return curr.value;
    }

    public isEmpty() {
        return this.size === 0;
    }

    private size = 0;
    private head: INode | null = null;
    private tail: INode | null = null;
}

export default async function run(executor: IExecutor, queue: AsyncIterable<ITask>, maxThreads = 0) {
    maxThreads = maxThreads || Infinity;

    const running = new Set<number>();
    const activeTasks = new Set<Promise<void>>();
    const taskBuffer = new LinkedList();

    let done = false;

    //  Читает задачи из итератора и кладёт в буфер
    async function readQueue() {
        for await (const task of queue) {
            taskBuffer.enqueue(task);
            void tryStart();
        }
        done = true;
        void tryStart();
    }

    //  Пытается запустить задачи из буфера
    async function tryStart() {
        while (activeTasks.size < maxThreads) {
            const task = taskBuffer.dequeue(running);
            if (!task) { break; }

            running.add(task.targetId);

            const p = executor.executeTask(task).then(() => {
                running.delete(task.targetId);
                activeTasks.delete(p);
                void tryStart(); // пробуем запустить следующую
            });

            activeTasks.add(p);
        }
    }

    //  Параллельно читаем задачи и выполняем
    void readQueue();

    //  Ждём, пока всё завершится
    while (!done || activeTasks.size > 0 || !taskBuffer.isEmpty()) {
        if (activeTasks.size === 0) {
            // если нечего делать — подождём немного
            await new Promise(r => setTimeout(r, 1));
        } else {
            await Promise.race(activeTasks);
        }
    }
}

// export default async function run(executor: IExecutor, queue: AsyncIterable<ITask>, maxThreads = 0) {
//     maxThreads = maxThreads || Infinity;
//
//     const runningTargetIds = new Set<number>();
//     const activeTasks: Set<Promise<void>> = new Set();
//     const taskQueue: ITask[] = [];
//
//     const iterator = queue[Symbol.asyncIterator]();
//
//     let reading = true;
//
//     async function tryStartTasks() {
//         while (activeTasks.size < maxThreads && taskQueue.length > 0) {
//             const index = taskQueue.findIndex(task => !runningTargetIds.has(task.targetId));
//             if (index === -1) break;
//
//             const task = taskQueue.splice(index, 1)[0];
//             runningTargetIds.add(task.targetId);
//
//             const taskPromise = executor.executeTask(task)
//                 .catch(() => {}) // Игнорируем ошибки исполнения, тесты проверяют логику, не падения
//                 .finally(() => {
//                     runningTargetIds.delete(task.targetId);
//                     activeTasks.delete(taskPromise);
//                     tryStartTasks(); // Пробуем взять новую задачу
//                 });
//
//             activeTasks.add(taskPromise);
//         }
//     }
//
//     while (true) {
//         if (activeTasks.size < maxThreads) {
//             const { value: task, done } = await iterator.next();
//
//             if (done) {
//                 reading = false;
//                 break;
//             }
//
//             taskQueue.push(task);
//             await tryStartTasks(); // пробуем запустить, если можно
//         } else {
//             // Ждём завершения хотя бы одной активной задачи
//             await Promise.race(activeTasks);
//         }
//     }
//
//     // Когда очередь закончилась, дожидаемся всех активных задач
//     while (activeTasks.size > 0) {
//         await Promise.all(activeTasks);
//     }
// }
