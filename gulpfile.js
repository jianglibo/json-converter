var gulp = require('gulp');
var testem = require('testem');
var babel = require("gulp-babel");
var sourcemaps = require("gulp-sourcemaps");
var del = require('del');
var replace = require('gulp-replace');
var watch = require('gulp-watch');
var through2 = require('through2');
var util = require('gulp-util');
var path = require('path');
var fs = require('fs');

var testemob = new testem();

var ciStarted = false;

gulp.task('delete-before', function() {
  del.sync(['./src-dist/*.js']);
  del.sync(['./test-dist/*.js']);
});

gulp.task('process-src', function() {
  gulp.src(["./src/*.js"])
    // .pipe(sourcemaps.init())
    .pipe(babel())
    // .pipe(sourcemaps.write("."))
    .pipe(gulp.dest("src-dist"));

});

gulp.task('preprocess-test', ['process-src'], function() {
  gulp.src(["./test/*.js"])
    // .pipe(sourcemaps.init())
    .pipe(replace(/(import\s+[^\s].+\s+from\s+['"]{1})(.+?)(['"]{1})/g, function(mt, p1, p2, p3) {
      var pp = p2.split("/").map(function(it) {
        if (it === "src") {
          return "src-dist";
        }
        return it;
      });
      return p1 + pp.join("/") + p3;
    }))
    .pipe(babel())
    // .pipe(sourcemaps.write("."))
    .pipe(gulp.dest("test-dist"));
});

gulp.task('testem', ['delete-before', 'preprocess-test'], function() {
  console.log(util.env);
  watch(["./test/*.js", "./src/*.js"], function() {
    gulp.start("preprocess-test");
  });

  var t = util.env.t || "*.js";
  var td = ["./test/" + t];
  var matches = [];
  gulp.src(td)
    .pipe(through2.obj(function(file, enc, cb) {
      matches.push(path.basename(file.path));
      cb(null, file);
    }, function(cb) {
      matches = matches.map(function(it) {
        return '"test-dist/' + it + '"';
      });
      var str = fs.readFileSync("tests.html", 'utf-8');
      str = str.replace(/(var tobetest = )\[(.+)\]/, "$1" + "[" + matches.join(",") + "]");
      fs.writeFileSync("tests.html", str);
      testemob.startDev();
      watch(["./test-dist/" + t], function(file) {
        console.log('restart');
        testemob.restart();
      });
    }));
});

gulp.task('default', ['preprocess-test']);
