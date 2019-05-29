function Observer(data) {
    // 衔接Observer函数的构造调用的上下文，我们可以看到，data只是vm._data的一个引用。
    // 这一点认知对于后面数据代理＋数据劫持原理的理解十分重要。
    this.data = data;
    // 这里的walk单词，可以理解为“遍历”的意思。
    // 遍历啥？答曰：遍历data所有层次的属性，并对其进行劫持（所谓的劫持，也就是用户对数据读取和写入的过程是不受用户控制了）。
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
        // 记住，this.data只是vm._data的一个引用
        // 从这里追溯引用链是这样的：
        // 用户传入的data -> vm.$option.data -> vm._data 
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
    // 1)在compile.js的line 147的“val = val[k]”（此处的val初始指向vm）。这是第一次；
    // 2)在watcher.js的line 63的“obj[exps[i]]”（此处的obj初始指向vm）。这是第二次；
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

        // data本来就有key这个属性了，这里是重新定义。从某种程度上来说，呼应的“劫持”的语义。
        Object.defineProperty(data, key, {
            enumerable: true, // 可枚举
            configurable: false, // 不能再define
            // 这里通过闭包，将key所对应的dep实例以及之间的引用持久化在内存当中了
            get: function() {
                console.log(`第${++visitCount}次冲击watcher的外交大门－－－－－－开始`)
                if (Dep.target) {
                    console.log( 'watcher的外交大门打开了，冲击成功！')
                    console.log(`${key}大臣走入watcher的议事大厅`)
                    dep.depend();
                }else {
                    console.log('watcher的外交大门关了，冲击失败！')
                    console.log(`${key}大臣被拒之门外`)
                }
                console.log(`第${visitCount}次冲击watcher的外交大门－－－－－－结束`)
                console.log('\n')
                return val;
            },
            // 1）这里通过闭包，将key所对应的dep实例以及之间的引用持久化在内存当中了
            // 2) 这里通过闭包，将value变量持久化子内存当中了
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

 // 只对引用类型，准确来说是“object”类型的属性进行属性监听
function observe(value, vm) {
    if (!value || typeof value !== 'object') {
        return;
    }

    return new Observer(value);
};


var uid = 0;

function Dep(name) {
    this.name = name;//  这一行代码是我加上去
    this.id = uid++; // id属性，dep实例的唯一标识符
    this.subs = []; //  我觉得这里命名为watchers更合适，dep的订阅者们就是watcher实例
}

Dep.prototype = {
    addSub: function(sub) {
        this.subs.push(sub);
    },

    depend: function() {
        // 这个target属性的值就是当前打开大门的watcher实例
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

// 关闭watcher实例的外交大门
Dep.target = null;
