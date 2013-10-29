
var canvas = document.getElementById('c');
var ctx = canvas.getContext('2d');

var h = 256;
var w = 256;


var Ray = (function () {
  function Ray(origin, direction) {
    this.origin = origin;
    this.direction = direction;
  }
  return Ray;
})();


var Vector = (function () {
  function Vector(x, y, z) {
    this.x = x;
    this.y = y;
    this.z = z;
  }
  Vector.times = function(k, v) {
    return new Vector(k * v.x, k * v.y, k * v.z);
  };
  Vector.prototype.scale = function(s) {
    return new Vector(this.x * s, this.y * s, this.z * s);
  };
  Vector.minus = function(k, v) {
    return new Vector(k.x - v.x, k.y - v.y, k.z - v.z);
  };
  Vector.plus = function(k, v) {
    return new Vector(k.x + v.x, k.y + v.y, k.z + v.z);
  };
  Vector.dot = function(k, v) {
    return k.x * v.x + k.y * v.y + k.z * v.z;
  };
  Vector.cross = function(k, v) {
    return new Vector(k.y * v.z - k.z * v.y, k.z * v.x - k.x * v.z, k.x * v.y - k.y * v.x);
  };
  Vector.prototype.magnitude = function() {
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
  };
  Vector.norm = function(k) {
    return k.scale(1 / k.magnitude());
  };
  Vector.distance = function(k, v) {
    var diff = Vector.minus(k, v);
    return diff.magnitude();
  };
  return Vector;
})();


var Sphere = (function () {
  function Sphere(position, radius, color) {
    this.pos = position;
    this.radius = radius;
    this.radius2 = radius * radius;
    this.color = color;
  }
  Sphere.prototype.intersects = function(ray) {
    var eo = Vector.minus(this.pos, ray.origin);
    var v = Vector.dot(eo, ray.direction);
    var dist = 0;
    if (v >= 0) {
      var disc = this.radius2 - (Vector.dot(eo, eo) - v * v);
      if (disc >= 0) {
        dist = v - Math.sqrt(disc);
      }
    }
    if (dist === 0) {
      return null;
    } else {
      return { object: this, ray: ray, dist: dist };
    }
  };
  return Sphere;
})();

var Plane = (function () {
  function Plane(norm, offset, color) {
    this.color = color;
    this.normal = function (pos) {
      return norm;
    };
    this.intersects = function (ray) {
      var denom = Vector.dot(norm, ray.direction);
      if (denom > 0) {
        return null;
      } else {
        var dist = (Vector.dot(norm, ray.origin) + offset) / (-denom);
        return { thing: this, ray: ray, dist: dist };
      }
    };
  }
  return Plane;
})();

var Camera = (function () {
  function Camera(pos, lookAt) {
    this.pos = pos;
    var down = new Vector(0.0, -1.0, 0.0);
    this.forward = Vector.norm(Vector.minus(lookAt, this.pos));
    this.right = Vector.times(1.5, Vector.norm(Vector.cross(this.forward, down)));
    this.up = Vector.times(1.5, Vector.norm(Vector.cross(this.forward, this.right)));
  }
  return Camera;
})();

var camera = new Camera(new Vector(3.0, 2.0, 4.0), new Vector(-1.0, 0.5, 0.0));

var objects = [
  new Plane(new Vector(0.0, 1.0, 0.0), 0.0, new Vector(100, 10, 125)),
  new Sphere(new Vector(0.0, 0.7, -0.25), 0.7, new Vector(200, 10, 25)),
  new Sphere(new Vector(-1.0, 1.5, 1.5), 0.5, new Vector(10, 200, 25)),
  new Sphere(new Vector(-0.5, 0.4, 0.75), 0.8, new Vector(20, 10, 200))
];

var lights = [
  { pos: new Vector(-2.0, 2.5, 0.0), color: new Vector(0.49, 0.07, 0.07) },
  { pos: new Vector(0.0, 2.5, -2.0), color: new Vector(0.07, 0.07, 0.49) }
];

function getPoint(x, y, camera) {
  var recenterX = function(x) { return (x - (w / 2.0)) / 2.0 / w; };
  var recenterY = function(y) { return -(y - (h / 2.0)) / 2.0 / h; };
  return Vector.norm(Vector.plus(camera.forward, Vector.plus(Vector.times(recenterX(x), camera.right), Vector.times(recenterY(y), camera.up))));
}

function intersects(obj, ray) {
  return obj.intersects(ray);
}

function getColor(x, y) {
    return { r: x % 255, g: y % 255, b: 0 };
}

console.time('raytrace');

for (var y = 0; y < h; y++) {
  for (var x = 0; x < w; x++) {
    var ray = new Ray(camera.pos, getPoint(x, y, camera));

    var color = new Vector(0, 0, 0);
    var minDistance = +Infinity;
    var object = null;

    for (var i = 0; i < objects.length; i++) {
      var obj = objects[i];
      var intersection = intersects(obj, ray);
      if (!intersection)
        continue;
      var distance = intersection.dist;
      if (distance >= minDistance)
        continue;

      object = obj;
      minDistance = distance;
    }
    
    var lightCount = 0;
    if (object) {
      var intersectionPoint = Vector.plus(ray.origin, ray.direction.scale(minDistance));

      for (var i = 0; i < lights.length; i++) {
        var light = lights[i];
        var ray2 = new Ray(intersectionPoint, Vector.norm(Vector.minus(light.pos, intersectionPoint)));
        var hitByLight = true;

        for (var o = 0; o < objects.length; o++) {
          var obj2 = objects[o];
          if (obj2 === object)
            continue;
          var intersection = intersects(obj2, ray2);
          if (intersection)
            hitByLight = false;
        }
        if (hitByLight)
          lightCount++;
      }
    }

    if (object) {
      if (lightCount > 0) {
        color = object.color.scale(lightCount*50/(minDistance*minDistance*minDistance)); // HACK
      } else {
        color = object.color.scale(0.5*50/(minDistance*minDistance*minDistance)); // HACK
      }
    }
    //color = object.color; // * light.brightness;

    ctx.fillStyle = 'rgb(' + Math.round(color.x) + ',' + Math.round(color.y) + ',' + Math.round(color.z) + ')';
    ctx.fillRect(x, y, 1, 1);
  }
}

console.timeEnd('raytrace');
