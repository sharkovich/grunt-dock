/*
 * MIT License (MIT)
 * Copyright (c) 2014 Johann Troendle
 *
 * This file is part of <grunt-dock>.
 */

var utils = require("./utils");
var Docker = require("dockerode");
var async = require("async");

/**
 * Push the given image to a registry
 *
 * @param {Object}
 *          grunt The Grunt Object
 * @param {Object}
 *          dockerIn The Dockerode connection
 * @param {Object}
 *          options The Grunt options
 * @param {Function}
 *          done The done function to call when finished
 */
var pushCommand = function (grunt, docker, options, done) {

    // Pushes an image
    // NOTE: since it has to change the image name to please Dockerode, the name
    // of the image is saved in a property and then restored
    var pushImage = function (img, options, callback) {

        var pushOptions = utils.composePushOptions(options, img);
        var image = docker.getImage(img.name);
        image.nameBackup = image.name;
        image.name = pushOptions.name;

        image.push(pushOptions, function (err, stream) {
            var streamError = null;
            image.name = image.nameBackup;
            delete image.nameBackup;

            if (err) {
                return callback(err);
            }

            stream.setEncoding("utf8");
            stream.on("error", (err) => {
                streamError = err;
                if (err) {
                    callback(err);
                }
            });

            stream.on("data", function (data) {
                var jsonData = JSON.parse(data);
                if (jsonData && jsonData.error) {
                    stream.emit("error", jsonData.error);
                }
                jsonData.stream && grunt.log.write(jsonData.stream);
            });

            stream.on("end", function () {
                if (!streamError) {
                    grunt.log.oklns("Push successfuly done.");
                    callback();
                }
            });
        }, options.auth);
    };

    var transformedImages = utils.transformImagesTags(options.images);
    async.each(transformedImages, (img, cb) => {
        pushImage(img, options, cb);
    }, done);

};

module.exports = pushCommand;
