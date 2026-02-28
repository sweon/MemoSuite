const { fabric } = require('fabric');
const p = new fabric.Path("M 0 0 Q 10 10 20 20 L 30 30");
console.log("Initialized path array:", p.path);
const obj = p.toObject();
obj.path = "M 0 0 Q 10 10 20 20 L 30 30";
fabric.Path.fromObject(obj, (created) => {
    console.log("From object parsed path:", created.path);
});
