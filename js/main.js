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

  function formatAsCurrency(total){
    return parseFloat(total, 10).toFixed(2);
  }

  function clearKeys(){
    KeyboardJS.clear('up');
    KeyboardJS.clear('down');
    KeyboardJS.clear('left');
    KeyboardJS.clear('right');
    KeyboardJS.disable();
  }

  function getCurrentExperiment(){
    
    var experiment = new Experiment();
    experiment.set('applicantId', currentApplicant.get('applicantId'));
    experiment.set('sessionNumber', currentExperiment.get('sessionNumber'));
    experiment.set('vrSchedule', currentExperiment.get('vrSchedule'));
    experiment.set('initialSelection', currentExperiment.get('initialSelection'));
    experiment.set('trialNumber', currentExperiment.get('trialNumber'));
    experiment.set('responsesInTrial', currentExperiment.get('responsesInTrial'));

    return experiment;
  }

  var ExperimentView = Parse.View.extend({
    events: {
      "click .continueCommitment" : "continueWithCommitment",
    },
    
    el: ".content",

    currentKey: '',

    initialize: function(experimentType) {
      var self = this;

      _.bindAll(this, 'onNewKey', 'render', 'continueWithCommitment');
      
      if(experimentType == 1){
        var trialNumber = Math.round(Math.random()*(session.get('values').length-1));
        var trial = session.get('values').splice(trialNumber, 1)[0];

        paymentManager.pay=appSettings.option1Pay;
        currentExperiment = new Experiment();
        currentExperiment.set('applicantId', currentApplicant.get('applicantId'));
        currentExperiment.set('sessionNumber', ++currentSessionNumber);
        currentExperiment.set('vrSchedule', session.get('name'));
        currentExperiment.set('initialSelection', 1);
        currentExperiment.set('trialNumber', ++currentTrialNumber);
        currentExperiment.set('responsesInTrial', trial);

      }else{
        paymentManager.pay=appSettings.option2Pay;
      }
      
      timeManager.experimentTime = Date.now();
      timeManager.totalTime = 0;

      responseNumber = 0;
      correctResponses = 0;

      KeyboardJS.enable();
      KeyboardJS.on('up', this.onNewKey);
      KeyboardJS.on('down', this.onNewKey);
      KeyboardJS.on('left', this.onNewKey);
      KeyboardJS.on('right', this.onNewKey);

      this.render(true);
      var experiment = new Experiment();
    },

    onNewKey: function(a) { // keycode 38
      experiment = getCurrentExperiment();

      experiment.set('responseNumber', ++responseNumber);
      var timeDifference = (Date.now() - timeManager.trialTimer) / 1000;

      if(responseNumber == 1){
        experiment.set('preRatioPausing', timeDifference.toFixed(2));
      } else{
        experiment.set('interTrialInterval', timeDifference.toFixed(2));
      }
      if(keyCode[currentKey] == a.keyCode){
        experiment.set('response', 1);
        correctResponses++;
      } else{
        experiment.set('response', 0)
      }

      timeManager.totalTime += timeDifference;
      
      experiment.save();

      this.render(false);
    },

    continueWithCommitment: function(){
      var responsesInTrial = currentExperiment.get('responsesInTrial');
      experiment = getCurrentExperiment();
      
      experiment.set('totalTime', timeManager.totalTime.toFixed(2));
      experiment.set('ratePerResponse', (responsesInTrial / timeManager.totalTime).toFixed(2));
      experiment.set('percentCorrectResponses', ((correctResponses / responseNumber)*100).toFixed(2));
      experiment.set('didSwitchToOption2', 'NO');
      experiment.set('cashEarned', formatAsCurrency(paymentManager.totalPay));
        
      experiment.save();
    },

    render: function(isFirstTime) {
      
      var responsesInTrial = currentExperiment.get('responsesInTrial');

      if(responseNumber >= responsesInTrial) {
        clearKeys();

        paymentManager.totalPay = paymentManager.pay * currentTrialNumber;

        if(session.get('values').length == 0){
          new ExperimentWaitView();
          this.undelegateEvents();
          delete this;
          return false;
        }

        var modelJson = {
          "trials" : currentTrialNumber,
          "payment" : formatAsCurrency(paymentManager.totalPay)
        }

        this.delegateEvents();
      
        var template = _.template($("#option-1-end").html());
        this.$el.html(template(modelJson));

        $('.option1').click(function() {
          new ExperimentView(1);
          delete self;
        });

        $('.option2').click(function() {
          
        });      

        return false;
      }

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
  
  var ExperimentWaitView = Parse.View.extend({
    el: ".content",

    initialize: function(){
      var self = this;
      _.bindAll(this, 'startNewSession', 'render');
      this.render();
    },

    startNewSession: function(){
      new ExperimentInstructionsView("#experiment-options", null, "startOption1Experiment", "startOption2Experiment");
      this.undelegateEvents();
      delete this;
    },

    render: function(){
      var template = _.template($('#experiment-wait').html());

      var modelJson = {
        "payment" : 5//formatAsCurrency(paymentManager.totalPay)
      }

      this.$el.html(template(modelJson));
      
      $("#getting-started").countdown("2015/01/01", function(event) {
        $(this).text(
          event.strftime('%D days %H:%M:%S')
        );
      });

      var fiveMinutes = 5 * 60 * 1000;
      _.delay(this.startNewSession, 5000); 
      this.delegateEvents();
    }
  });

  var ExperimentInstructionsView = Parse.View.extend({
    el: ".content",

    initialize: function(content, model, action1, action2){
      var self = this;
      _.bindAll(this, 'startOption1Experiment', 'startOption2Experiment');
      this.render(content, model, action1, action2);

    },

    startOption1Experiment: function(){
      var sessionNumber = Math.round(Math.random()*(sessions.length-1));
      session = sessions.splice(sessionNumber, 1)[0];
        
      new ExperimentView(1);
      this.undelegateEvents();
      delete this;
    },

    startOption2Experiment: function(){
      new ExperimentView(2);
      this.undelegateEvents();
      delete this;
    },

    render: function(content, model, action1, action2){
      var self = this;
      var template = _.template($('#experiment-options').html());

      if(model != null){
        this.$el.html(template(model.toJSON()));
      }else{
        this.$el.html(template  );
      }
      var action1ToPerform = action1;
      var action2ToPerform = action2;

      $('.option1').click(function() {
       switch (action1ToPerform) {
        case "startOption1Experiment": self.startOption1Experiment(); break;
       }
      });

      $('.option2').click(function() {
       switch (action2ToPerform) {
        case "startOption2Experiment": self.startOption2Experiment(); break;
       }
      });

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
      new ExperimentInstructionsView("#experiment-options", null, "startOption1Experiment", "startOption2Experiment");
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

      _.bindAll(this, 'onNewKey', 'renderSuccess', 'renderFail', 'render');

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
      clearKeys();
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
      new ExperimentWaitView();
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
