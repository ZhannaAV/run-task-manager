# 🧵 run-task-manager
![CI](https://github.com/ZhannaAV/run-task-manager/actions/workflows/ci.yml/badge.svg)

**Асинхронный менеджер задач с ограничением по targetId и параллелизму.**  
Решение, имитирующее диспетчер очередей в многопоточном окружении.

![TypeScript](https://img.shields.io/badge/-TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)
![Async](https://img.shields.io/badge/-Async/Await-blueviolet?style=flat)
![Concurrency](https://img.shields.io/badge/-Concurrency-lightgreen?style=flat)

---

## 📌 Описание

Менеджер задач `run()` обрабатывает асинхронную очередь, выполняя задачи с ограничением:

- 🧠 **Каждый `targetId` может быть активен только в одной задаче**
- ⚙️ **Ограничение количества параллельных задач (`maxThreads`)**
- ♻️ Поддержка **отложенных задач** и **бесконечных генераторов**

---

## ⚙️ Пример использования

```ts
await run(executor, asyncQueue, 3);

