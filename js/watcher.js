function Watcher(vm, expOrFn, cb) {
    this.cb = cb;
    this.vm = vm;
    this.expOrFn = expOrFn;
    this.depIds = {};

    if (typeof expOrFn === 'function') {
        this.getter = expOrFn;
    } else {
        this.getter = this.parseGetter(expOrFn.trim());
    }

    this.value = this.get();
}

Watcher.prototype = {
    update: function() {
        this.run();
    },
    run: function() {
        var value = this.get(); // 通过手动调用this.get()来获取该表达式最新的值
        var oldVal = this.value; // 旧值保存在this.value当中
        if (value !== oldVal) {
            this.value = value;
            // 这个cb是个关键人人物，它是实例化时候我们传递进来的函数。
            // 这个函数就是我们的调用栈的“见底函数”－负责具体的DOM操作
            this.cb.call(this.vm, value, oldVal);
        }
    },
    addDep: function(dep) {
        // 1. 每次调用run()的时候会触发相应属性的getter
        // getter里面会触发dep.depend()，继而触发这里的addDep
        // 2. 假如相应属性的dep.id已经在当前watcher的depIds里，说明不是一个新的属性，仅仅是改变了其值而已
        // 则不需要将当前watcher添加到该属性的dep里
        // 3. 假如相应属性是新的属性，则将当前watcher添加到新属性的dep里
        // 如通过 vm.child = {name: 'a'} 改变了 child.name 的值，child.name 就是个新属性
        // 则需要将当前watcher(child.name)加入到新的 child.name 的dep里
        // 因为此时 child.name 是个新值，之前的 setter、dep 都已经失效，如果不把 watcher 加入到新的 child.name 的dep中
        // 通过 child.name = xxx 赋值的时候，对应的 watcher 就收不到通知，等于失效了
        // 4. 每个子属性的watcher在添加到子属性的dep的同时，也会添加到父属性的dep
        // 监听子属性的同时监听父属性的变更，这样，父属性改变时，子属性的watcher也能收到通知进行update
        // 这一步是在 this.get() --> this.getVMVal() 里面完成，forEach时会从父级开始取值，间接调用了它的getter
        // 触发了addDep(), 在整个forEach过程，当前wacher都会加入到每个父级过程属性的dep
        // 例如：当前watcher的是'child.child.name', 那么child, child.child, child.child.name这三个属性的dep都会加入当前watcher
        if (!this.depIds.hasOwnProperty(dep.id)) {
            // 这句代码实际就是调用this.subs.push(watcher)这行语句。
            // 因为this.subs是数组，所以，我们不禁问：“为什么this.subs要设计为数组呢？”。
            // 又因为数组里面装的是watcher实例，言下之意，我们是在自问：“dep实例为什么会对应多个watcher实例呢？”。
            // 答曰：“那是因为存在一种情况，一个dep实例会对应多个watcher实例”。
            // 当模板中多个表达式里面访问了同一个属性的情况下，一个dep实例就会有多个watcher实例。
            // 为什么会这么说呢？
            // 那是因为就像我们在observer.js注释里面所说的那样，一个属性对应一个dep实例。同样，一个表达式也对应着一个watcher实例。
            // 那么，多个表达式就对应着多个watcher实例，也就是说多个watcher对应着同一个属性，而一个属性就对应着一个dep实例。
            // 综上所述，也就是说一个dep实例是有可能对应着多个watcher实例的。
            dep.addSub(this); 
            this.depIds[dep.id] = dep;
            console.log('首次，成功建立外交关系')
        }else {
            console.log('已经建立外交关系，不需重复建立')
        }
    },
    get: function() {
        Dep.target = this; // 在这里watcher实例把自己的大门打开，欢迎dep实例与自己建立关系。
        var value = this.getter.call(this.vm, this.vm._data);
        // var value = this.getter.call(this.vm, this.vm);
        Dep.target = null;
        return value;
    },
    // 在实例化的时候，就通过闭包，把“表达式”变量持久化在内存当中。
    // 再在this.get()方法调用的时候，把watcher实例 ＝》 表达式 ＝》 依赖属性 ＝》 dep实例的关系链建立起来。
    parseGetter: function(exp) {
        if (/[^\w.$]/.test(exp)) return; 

        var exps = exp.split('.');

        return function(obj) {
            for (var i = 0, len = exps.length; i < len; i++) {
                if (!obj) return;
                obj = obj[exps[i]];
            }
            return obj;
        }
    }
};
