// Karma configuration file, see link for more information
// https://karma-runner.github.io/1.0/config/configuration-file.html

/* tslint:disable*/
module.exports = function (config) {
    config.set({
        basePath: "",
        client: {
            clearContext: false // leave Jasmine Spec Runner output visible in browser
        },
        frameworks: ["jasmine", "@angular-devkit/build-angular"],
        plugins: [
            require("karma-jasmine"),
            require("karma-chrome-launcher"),
            require("karma-jasmine-html-reporter"),
            require("karma-coverage-istanbul-reporter"),
            require("@angular-devkit/build-angular/plugins/karma")
        ],
        coverageIstanbulReporter: {
            dir: require("path").join(__dirname, "../coverage/pouchwiki"),
            fixWebpackSourcePaths: true,
            reports: ["html", "lcovonly", "text-summary"],
        },
        files: [
            "karma.variables.js",
        ],
        reporters: ["progress", "kjhtml"],
        port: 9876,
        colors: true,
        logLevel: config.LOG_INFO,
        autoWatch: true,
        browsers: ["Chrome"],
        singleRun: false,
        restartOnFileChange: true
    });
};
