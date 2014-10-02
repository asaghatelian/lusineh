// An example Parse.js Backbone application based on the todo app by
// [Jérôme Gravel-Niquet](http://jgn.me/). This demo uses Parse to persist
// the todo items and provide user authentication and sessions.

$(function() {

  Parse.$ = jQuery;

  // Initialize Parse with your Parse application javascript keys
  Parse.initialize("MzcDFN8ustfDQhDyohncIvXcvTDRuu1J95y46BCM",
                   "wqU7vFwjZzo35M25hhypr2wxPwH38Ikg1AJr4OhP");

  /*
  window.onbeforeunload = function() {
    return "WARNING!!! Data will be lost if you leave the page, are you sure?";
  };
  */

  // Parse Objects
  var Session = Parse.Object.extend("session");
  var Applicant = Parse.Object.extend("Applicant");
  var Counter = Parse.Object.extend("Counter");
  var Experiment = Parse.Object.extend("Experiment");
  var Trial = Parse.Object.extend("Trial");

  // Global Variables
  var sessions = null;
  var practiceCount = 0;
  var practiceFailure = 0;
  
  var currentApplicant;
  var currentSessionNumber = 0;
  var currentTrialNumber = 0;
  var currentExperiment;
  var experimentType;
  var responseNumber = 0;
  var correctResponses = 0;

  // Set Defaults
  var appSettings = new Object();
  appSettings.option1Pay=1
  appSettings.option2Pay=0.5
  appSettings.practiceTotal=1

  var paymentManager = new Object();
  var timeManager = new Object();

  var keys = ['up','down','left','right'];
  var keyCode = ['38', '40', '37', '39'];

  var AppState = Parse.Object.extend("AppState", {
  });

  var ExperimentView = Parse.View.extend({
    events: {
      //"click .continueButton" : "continueToExperimentInstructions",
    },
    
    el: ".content",

    currentKey: '',

    initialize: function() {
      var self = this;

      _.bindAll(this, 'onNewKey', 'render');
      
      if(experimentType == 1){
        paymentManager.pay=appSettings.option1Pay;
      }else{
        paymentManager.pay=appSettings.option2Pay;
      }
      
      timeManager.practiceTime = Date.now();
      timeManager.totalTime = 0;

      responseNumber = 0;
      correctResponses = 0;

      KeyboardJS.enable();
      KeyboardJS.on('up', this.onNewKey);
      KeyboardJS.on('down', this.onNewKey);
      KeyboardJS.on('left', this.onNewKey);
      KeyboardJS.on('right', this.onNewKey);

      this.render(true);

    },

    onNewKey: function(a) { // keycode 38
      var trial = new Trial();
      trial.set('responseNumber', ++responseNumber);
      var timeDifference = (Date.now() - timeManager.trialTimer) / 1000;

      if(responseNumber == 1){
        trial.set('preRatioPausing', timeDifference.toFixed(2));
      } else{
        trial.set('interTrialInterval', timeDifference.toFixed(2));
      }
      if(keyCode[currentKey] == a.keyCode){
        trial.set('response', 1);
        correctResponses++;
      } else{
        trial.set('response', 0)
      }
      timeManager.totalTime += timeDifference;
      trial.set('totalTime', timeManager.totalTime.toFixed(2));
      //trial.set('ratePerResponse', )
      trial.set('percentCorrectResponses', ((correctResponses / responseNumber)*100).toFixed(2));
      trial.save();

      this.render(false);
    },

/*
    continueToExperimentInstructions: function() {
      new InstructionView("#experiment-instructions", "continueToExperiment");
      this.undelegateEvents();
      delete this;
    },

    renderComplete: function() {
      KeyboardJS.clear('up','down','left','right');
      var totalTries = practiceCount + practiceFailure;
      var totalTime = (Date.now() - timeManager.practiceTime) / 1000;


      currentApplicant.set("practiceTime", totalTime);
      currentApplicant.set("practiceTries", totalTries);
      currentApplicant.save();

      this.$el.html(_.template($("#practice-complete").html()));
      this.delegateEvents();
    },
*/
    render: function(isFirstTime) {
      
      if(this.currentKey != undefined){
        currentKey = Math.round(Math.random()*3);
      }

      if(isFirstTime) {
        this.$el.html(_.template($("#experiment").html()));
        $('.jumbotron h3').html('Press the following key:');
      }
      
      $('#experiment-item').attr('class', 'glyphicon glyphicon-arrow-' + keys[currentKey])

      timeManager.trialTimer = new Date();

      this.delegateEvents();
    }
  });
  

  var ExperimentInitialView = Parse.View.extend({
    events: {
      "click .option1" : "onOption1",
      "click .option2" : "onOption2"
    },

    el: ".content",

    initialize: function(){
      var self = this;
      if(sessions.length <= 0){
        alert('done!')
      }
      var session = '';
      var trial = '';
      this.render();
    },

    onOption1: function(){
      currentExperiment = new Experiment();
      currentExperiment.set('applicantId', currentApplicant.get('applicantId'));
      var sessionNumber = Math.round(Math.random()*(sessions.length-1));
      session = sessions.splice(sessionNumber, 1)[0];
      currentExperiment.set('sessionNumber', ++currentSessionNumber);
      currentExperiment.set('vrSchedule', session.get('name'));
      currentExperiment.set('initialSelection', 1);
      currentExperiment.set('trialNumber', ++currentTrialNumber);
      var trialNumber = Math.round(Math.random()*(session.get('values').length-1));
      var trial = session.get('values').splice(trialNumber, 1)[0];
      currentExperiment.set('responsesInTrial', trial);
      currentExperiment.save();
      
      // Show experiment
      new ExperimentView();
      this.undelegateEvents();
      delete this;

    },

    onOption2: function(){
      var sessionNumber = Math.round(Math.random()*4);
    },

    render: function(){
      this.$el.html(_.template($("#experiment-options").html()));
      this.delegateEvents();

    }

  });

  var InstructionView = Parse.View.extend({
    el: ".content",

    initialize: function(content, action){
      var self = this;
      _.bindAll(this, 'continueToExperiment', 'render');
      this.render(content, action);
    },

    continueToExperiment: function(){
      new ExperimentInitialView();
      this.undelegateEvents();
      delete this;
    },

    render: function(content, action){
      this.$el.html(_.template($(content).html()));
      var self = this;
      var actionToPerform = action;
      $('.continueButton').click(function() {
       switch (actionToPerform) {
        case "continueToExperiment": self.continueToExperiment(); break;
       }
      });
      this.delegateEvents();
    }
  });

  var PracticeView = Parse.View.extend({
    events: {
      "click .continueButton" : "continueToExperimentInstructions",
    },
    
    el: ".content",

    currentKey: '',

    initialize: function(redo) {
      var self = this;

      _.bindAll(this, 'clearKeys', 'onNewKey', 'renderSuccess', 'renderFail', 'render');

      timeManager.practiceTime = Date.now();
      this.render(false);

      KeyboardJS.on('up', this.onNewKey);
      KeyboardJS.on('down', this.onNewKey);
      KeyboardJS.on('left', this.onNewKey);
      KeyboardJS.on('right', this.onNewKey);

    },

    onNewKey: function(a) { // keycode 38

      if(keyCode[currentKey] == a.keyCode){
        this.renderSuccess();
      } else{
        this.renderFail();
      }
    },

    continueToExperimentInstructions: function() {
      new InstructionView("#experiment-instructions", "continueToExperiment");
      this.undelegateEvents();
      delete this;
    },

    renderSuccess: function() {
      practiceCount++;
      KeyboardJS.disable();

      $('.jumbotron h3').html('Great!');
      $('#practice-item').attr('class', 'glyphicon glyphicon-thumbs-up')

      var self = this;
      setTimeout(function(){
        self.render(false);
      }, 1500);
    },

    clearKeys: function(){
      KeyboardJS.clear('up');
      KeyboardJS.clear('down');
      KeyboardJS.clear('left');
      KeyboardJS.clear('right');
      KeyboardJS.disable();
    },

    renderFail: function() {
      practiceFailure++;
      KeyboardJS.disable();

      $('.jumbotron h3').html('Please Try Again');
      $('#practice-item').attr('class', 'glyphicon glyphicon-thumbs-down')
     
      var self = this;
      setTimeout(function(){
        self.render(true);
      }, 1500);
    },

    renderComplete: function() {
      this.clearKeys();
      var totalTries = practiceCount + practiceFailure;
      var totalTime = (Date.now() - timeManager.practiceTime) / 1000;


      currentApplicant.set("practiceTime", totalTime.toFixed(2));
      currentApplicant.set("practiceTries", totalTries);
      currentApplicant.save();

      this.$el.html(_.template($("#practice-complete").html()));
      this.delegateEvents();
    },

    render: function(redo) {
      
      if(practiceCount == appSettings.practiceTotal){
        this.renderComplete();
        return false;
      }

      KeyboardJS.enable();

      if(this.currentKey != undefined && !redo){
        currentKey = Math.round(Math.random()*3);
      }

      this.$el.html(_.template($("#practice").html()));
      $('.jumbotron h3').html('Press the following key:');
      $('#practice-item').attr('class', 'glyphicon glyphicon-arrow-' + keys[currentKey])
      this.delegateEvents();
    }
  });

  var PracticeInstructionsView = Parse.View.extend({
    events: {
      "click .continueButton" : "continueToPractice",
    },

    el: ".content",

    initialize: function() {
      var self = this;
      this.render();
    },

    continueToPractice: function() {
      new PracticeView();
      this.undelegateEvents();
      delete this;
    },

    render: function() {
      this.$el.html(_.template($("#practice-instructions").html()));
      this.delegateEvents();
    }
  });


  var LogInView = Parse.View.extend({
    events: {
      "submit form.signup-form": "signUp"
    },

    el: ".content",
    
    initialize: function() {
      var self = this;

      _.bindAll(this, "signUp");
      this.render();

      var query = new Parse.Query(Counter);
      query.descending("count");
      query.limit(1);
      
      query.find({
        success: function(results) {
          var newApplicantId = 101;
          var latestApplicant = 0;

          if(results[0] != undefined){
            latestApplicant = results[0].get('count');
            newApplicantId = latestApplicant + 1;
            results[0].increment('count');
            results[0].save();
          }else{
            var newApplicant = new Counter();  
            newApplicant.save({'count': newApplicantId});
          }
          this.$("#signup-id").val(newApplicantId);
        },
        error: function(error) {
          alert("Error: " + error.code + " " + error.message);
        }
      });

    },

    signUp: function(e) {
      e.preventDefault();
      var self = this;
      var id = this.$("#signup-id").val();
      var sex = this.$("#signup-sex").val();
      var age = this.$("#signup-age").val();
      var education = this.$("#signup-education").val();
      
      if(id == '' || isNaN(id) || id < 100){
        self.$(".signup-form .error").html("Please enter a valid ID which is more than 100!").show();
        return false;
      }

      if(sex  == '' || age == '' || education == ''){
        self.$(".signup-form .error").html("Please enter valid information!").show();
        return false;
      }

      var applicant = new Applicant();
      applicant.set("applicantId", id);
      applicant.set("sex", sex);
      applicant.set("age", age);
      applicant.set("education",  education);

      applicant.save(null, {
        success: function(applicant) {
          currentApplicant = applicant;
          new PracticeInstructionsView();
          self.undelegateEvents();
          delete self;
        },

        error: function(applicant, error) {
          alert(error.message)
        }
      })
      
      self.$(".signup-form button").attr("disabled", "disabled");

      return false;
    },

    render: function() {
      this.$el.html(_.template($("#login").html()));
      //this.$el.html(_.template($("#experiment-options").html()));
      this.delegateEvents();
    }
  });

  // The main view for the app
  var AppView = Parse.View.extend({
    // Instead of generating a new element, bind to the existing skeleton of
    // the App already present in the HTML.
    el: $("#app"),

    initialize: function() {
      this.render();
    },

    render: function() {
      new LogInView();
    }
  });

  var AppRouter = Parse.Router.extend({
    routes: {
      "all": "all",
      "active": "active",
      "completed": "completed"
    },

    initialize: function(options) {
      var sessionQuery = new Parse.Query(Session);
      sessionQuery.ascending('number')
      sessionQuery.find({
        success: function(results) {
          sessions = results;
        },
        error: function(error) {
          alert(error.message);
        }
      });
    },

  });

  var state = new AppState;

  new AppRouter;
  new AppView;

  Parse.history.start();

});
