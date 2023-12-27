// eslint-disable-next-line no-unused-vars
const ENOUGH_TIME = 1; // milliseconds

let  workQueue = [];
let nextUnitOfWork = null; // 全局变量, 那么一次只能走一个回调

// Fiber tags
const HOST_COMPONENT = "host";
const CLASS_COMPONENT = "class";
const HOST_ROOT = "root";

// Global state
const updateQueue = [];
let pendingCommit = null;

function render(elements, containerDom) {
    updateQueue.push({ // 用作一个队列, 先进先出
        from: HOST_ROOT,
        dom: containerDom,
        newProps: { children: elements }
      });
    requestIdleCallback(performWork); // 下一个浏览器空闲时
}

function scheduleUpdate(instance, partialState) {
    updateQueue.push({
        from: CLASS_COMPONENT,
        instance: instance,
        partialState: partialState
    });
    requestIdleCallback(performWork);
}

function schedule(task) { // 1. 加
    workQueue.push(task); // 2. 存好了
    window.requestIdleCallback(performWork); // 3. 下一次空闲运行, performWork 函数
}

function performWork(deadline) {
    workLoop(deadline);
    if(!nextUnitOfWork){
        nextUnitOfWork = workQueue.shift(); // 4. 拿出来,
    }

    // 下一回调 与 看看有没有 足够的时间 再走一趟 
    while (nextUnitOfWork && deadline.timeRemaining() > ENOUGH_TIME) {
        // 5. DO something
        nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
    }

    if (nextUnitOfWork || workQueue.length > 0) {
         // 6. 如果还没有搞定, 那么 再等空闲咯
         requestIdleCallback(performWork)
    }
}

function workLoop(deadline) {
    if (!nextUnitOfWork) {
        resetNextUnitOfWork();
    }
    while (nextUnitOfWork && deadline.timeRemaining() > ENOUGH_TIME) {
        // 关注时间 是否足够 运行另一个工作单元
        nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
    }

    if (pendingCommit) {
        commitAllWork(pendingCommit);
    }
}

function resetNextUnitOfWork() {
    const update = updateQueue.shift();
    if(!update){
        return;
    }

    if (update.partialState) {
        update.instance.__fiber.partialState = update.partialState;
    }

    const root = update.from == HOST_ROOT ? update.dom._rootContainerFiber : getRoot(update.instance.__fiber);
    nextUnitOfWork = {
        tag: HOST_ROOT,
        stateNode: update.dom || root.stateNode, // 两种情况
        props: update.newProps || root.props,
        alternate: root
    }
}

function getRoot(fiber) {
    let node = fiber;
    while (node.parent) {
        node = node.parent;
    }

    return node;
}

function performUnitOfWork(wipFiber) {
    beginWork(wipFiber);
    if (wipFiber.child) { // 工作没有完成, 返回下一次更新的状态
        return wipFiber.child;
    }

    // No child, we call completeWork until we find a sibling
    let uow = wipFiber;
    while (uow) {
        completeWork(uow);
        if (uow.sibling) {
             // Sibling 返回, 再次变为 wipFiber, 被 beginWork 调用
             return uow.sibling;
        }

        uow = uow.parent;
    }
}

function beginWork(wipFiber) {
    if (wipFiber.tag === CLASS_COMPONENT) {
        updateClassComponent(wipFiber);
    } else {
        updateHostComponent(wipFiber);
    }
}

function updateHostComponent(wipFiber) {
    if (!wipFiber.stateNode) {
        wipFiber.stateNode = createDomElement(wipFiber);
    }
    const newChildElements = wipFiber.props.children;
    reconcileChildrenArray(wipFiber, newChildElements);
}

function updateClassComponent(wipFiber) {
    let instance = wipFiber.stateNode;
    if (instance == null) {
        // 调用类初始化
        instance = wipFiber.stateNode = createInstance(wipFiber);
    } else if (wipFiber.props == instance.props && !wipFiber.partialState) {
        // 不需要更新,最后 复制 孩子
        cloneChildFibers(wipFiber);
        return;
    }

    instance.props = wipFiber.props;
    instance.state = Object.assign({}, instance.state, wipFiber.partialState);
    wipFiber.partialState = null;

    const newChildElements = wipFiber.stateNode.render();
    reconcileChildrenArray(wipFiber, newChildElements);
}