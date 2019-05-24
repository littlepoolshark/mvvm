function Observer(data) {
    this.data = data;
    this.walk(data);
}

Observer.prototype = {
    walk: function(data) {
        var me = this;
        Object.keys(data).forEach(function(key) {
            me.convert(key, data[key]);
        });
    },
    convert: function(key, val) {
        this.defineReactive(this.data, key, val);
    },
    // 注意，这个data不是一个独立的对象，它是vm._data的一个引用。
    // 理解这里就需要对js的【引用传递】有一个深刻的认知才行。
    // 在整个实现代码里面，只有一个地方读取vm._data里面的属性，那即是mvvm.js的line 31的 “return me._data[key]”语句。
    // 我们可以看到，就是在那里，我们实现了对vm属性的代理。
    // 综上所述，只要是访问vm的属性，那么就会访问vm._data的属性；只要访问vm._data的属性就会进入以下代码中的get函数，
    // get函数做了啥呢？它做的事就是：尝试给dep实例和watcher实例建立双向关联。核心语句"dep.pend()"就是干这事的。
    // 好，我们来总结一下：vm[xxx] =>（代理到） vm._data[xxx] =>（被观察）  dep.depend()
    // 那么问题就来了，在我们的源码里，我们在哪里访问了vm的属性呢？
    // 答案是有两个地方：
    // 1)在compile.js的line 147的“val = val[k]”（此处的val初始是指向vm）。这是第一次；
    // 2)在watcher.js的line 63的“obj[exps[i]]”（此处的obj指向就是vm）。这是第二次；
    // 以上两行语句的导火索都是在compile.js的line 123的bind函数里面
    // 第一次所对应的导火索是：this._getVMVal(vm, exp)。
    // 第二次所对应的导火索是： new Watcher（）。
    defineReactive: function(data, key, val) {
        // //因为要监听vm._data(时刻要记住，此处的形参data就是vm._data)的所有层次属性，所以，有vm._data有多少个属性，我们就有多少个dep的实例
        var dep = new Dep();
        // 在这里，通过【间接递归】调用defineReactive方法，实现了对vm._data对象所有层次属性的监听。
        var childObj = observe(val);
        // 从上面的两行代码中，我们可以看出vm._data对象的（所有层次）属性与dep实例的关联。
        // 从集合的概念来说，dep实例与vm._data对象的（所有层次）属性是一一对应的关系。
        // 因为每个属性都被注册了getter回调，所有我们综合一下，它们三者关系路径是这样的：
        // dep实例 =》 vm._data对象属性 =》 getter回调

        Object.defineProperty(data, key, {
            enumerable: true, // 可枚举
            configurable: false, // 不能再define
            get: function() {
                if (Dep.target) {
                    dep.depend(); // 【尝试给dep实例和watcher实例建立双向关联】
                }
                return val;
            },
            set: function(newVal) {
                if (newVal === val) {
                    return;
                }
                val = newVal;
                // 新的值是object的话，进行监听
                childObj = observe(newVal);
                // 通知所有订阅者。这里的订阅者就是watcher实例
                dep.notify();
            }
        });
    }
};

function observe(value, vm) {
    if (!value || typeof value !== 'object') {
        return;
    }

    return new Observer(value);
};


var uid = 0;

function Dep() {
    this.id = uid++;
    this.subs = [];
}

Dep.prototype = {
    addSub: function(sub) {
        this.subs.push(sub);
    },

    depend: function() {
        Dep.target.addDep(this);
    },

    removeSub: function(sub) {
        var index = this.subs.indexOf(sub);
        if (index != -1) {
            this.subs.splice(index, 1);
        }
    },

    notify: function() {
        this.subs.forEach(function(sub) {
            sub.update();
        });
    }
};

Dep.target = null;
