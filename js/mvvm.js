function MVVM(options) {
    this.$options = options || {};
    var data = this._data = this.$options.data;
    var me = this;

    // 第一步：数据代理
    // 实现 vm.xxx -> vm._data.xxx
    // 数据代理并不是mvvm的必要和核心特征，它只是一个便利之举而已。也就是说，有了它，我们不用写vm._data.xxx而是少些几个字符－ vm.xxx。
    // mvvm的核心特征是数据绑定（通过数据劫持，个人觉得，称之为属性劫持或者属性监听可能更准确）来实现页面的自动更新。
    // 不信？我们不妨试一试禁用数据代理情况下，数据绑定是否生效？
    // 1) 把mvvm.js的构造函数MVVM的数据代理代码注释掉
    // 2) 在自定义类型watcherde的get方法里面对this.getter的调用传参时，把第二个参数从“this.vm”替换为"this.vm._data"
    // 3) 在自定义类型compile的bind方法里面对this._getVMVal的调用传参时，把第一个参数从“vm”替换为“vm._data”
    // 保存更新后，刷新页面，我们发现，数据绑定功能并没有受到影响。
    Object.keys(data).forEach(function(key) {
        me._proxyData(key);
    });

    this._initComputed();
   
    // 第二步：对data所有层次的属性进行监听，并生成该属性的对应的dep实例，利用闭包来将这种关系持久化在内存当中，等待后续与watcher建立双向关联。
    observe(data, this);
    
    // 第三步：编译模板。其中又可以分为两步：
    // 1) 完成界面的初始显示
    // 2) 为表达式创建对应的watcher实例，并完成与［该表达式所依赖的属性］的dep实例的双向关联。
    this.$compile = new Compile(options.el || document.body, this)
}

MVVM.prototype = {
    // 这个key就是我们模板里面的表达式
    $watch: function(key, cb, options) {
        new Watcher(this, key, cb);
    },
    // 这个方法注意的一点是，它只对vm的第一层属性进行代理
    // 它并没有像observer的内部实现中的defineReactive方法那样，通过间接递归来实现对象的所有层次的数据代理。
    _proxyData: function(key, setter, getter) {
        var me = this;
        setter = setter || 
        Object.defineProperty(me, key, {
            configurable: false,
            enumerable: true,
            get: function proxyGetter() {
                console.log(`into _proxyData -> ${key}的getter`)
                return me._data[key];
            },
            set: function proxySetter(newVal) {
                me._data[key] = newVal;
            }
        });
        // console.log('setter:',setter)
    },

    _initComputed: function() {
        var me = this;
        var computed = this.$options.computed;
        if (typeof computed === 'object') {
            Object.keys(computed).forEach(function(key) {
                Object.defineProperty(me, key, {
                    get: typeof computed[key] === 'function' 
                            ? computed[key] 
                            : computed[key].get,
                    set: function() {}
                });
            });
        }
    }
};
