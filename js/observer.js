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
    // 而整个实现代码里面，只有一个地方读取vm._data里面的属性，那即是mvvm.js的line 31的 “return me._data[key]”语句。
    // 从源码来看，“return me._data[key]”语句身处一个getter中，它负责对vm属性的代理。
    // 综上所述，只要是访问vm的属性，那么就会访问vm._data的属性，只要访问vm._data的属性就会进入以下代码中的get函数，
    // 就说是就会【尝试给dep实例和watcher实例建立双向关联】---"dep.pend()"要干就是这件事。
    // 好，我们来总结一下：vm[xxx] => vm._data[xxx] =>  dep.depend()
    // 那么问题就来了，在我们的实现代码里，我们在哪里访问了vm的属性呢？
    // 答案是有两个地方：
    // 1)在compile.js的line 126的“this._getVMVal(vm, exp)”的函数调用中。这是第一次；
    // 2)在watcher.js的line 63的“obj[exps[i]]”（此处的obj指向就是vm）。这是第二次；
    // 以上两行语句的导火索都在compile.js的line 123的bind函数。
    defineReactive: function(data, key, val) {
        var dep = new Dep();
        var childObj = observe(val);

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
                // 通知订阅者
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
