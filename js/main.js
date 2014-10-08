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

  function startNewSession(){
    var sessionNumber = Math.round(Math.random()*(sessions.length-1));
    session = sessions.splice(sessionNumber, 1)[0];
    currentTrialNumber = 0;
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
    el: ".content",

    currentKey: '',

    initialize: function(doSave, didCashOut) {
      var self = this;

      _.bindAll(this, 'onNewKey', 'render');
      
      var initialSelection = currentExperiment != undefined ? currentExperiment.get('initialSelection') : undefined;
      
      if(doSave){
        var didSwitch = false;

        if(initialSelection == 1 && experimentType == 2){
          didSwitch = true;
        }

        this.saveExperimentResults(didSwitch, didCashOut);
      }

      if(experimentType == 1){
        var trialNumber = Math.round(Math.random()*(session.get('values').length-1));
        var trial = session.get('values').splice(trialNumber, 1)[0];

        paymentManager.pay = appSettings.option1Pay;
        currentExperiment = new Experiment();
        currentExperiment.set('applicantId', currentApplicant.get('applicantId'));
        currentExperiment.set('sessionNumber', ++currentSessionNumber);
        currentExperiment.set('vrSchedule', session.get('name'));
        if(initialSelection == undefined){
          currentExperiment.set('initialSelection', 1);  
        }
        currentExperiment.set('trialNumber', ++currentTrialNumber);
        currentExperiment.set('responsesInTrial', trial);

      }else{
        var trialNumber = Math.round(Math.random()*(session.get('values').length-1));
        var trial = session.get('values').splice(trialNumber, 1)[0];

        paymentManager.pay=appSettings.option2Pay;
        currentExperiment = new Experiment();
        currentExperiment.set('applicantId', currentApplicant.get('applicantId'));
        currentExperiment.set('sessionNumber', ++currentSessionNumber);
        currentExperiment.set('vrSchedule', session.get('name'));
        if(initialSelection == undefined){
          currentExperiment.set('initialSelection', 2);  
        }
        currentExperiment.set('trialNumber', ++currentTrialNumber);
        currentExperiment.set('responsesInTrial', trial);
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

    saveExperimentResults: function(didSwitch, didCashOut){
      var responsesInTrial = currentExperiment.get('responsesInTrial');
      experiment = getCurrentExperiment();
      
      experiment.set('totalTime', timeManager.totalTime.toFixed(2));
      experiment.set('ratePerResponse', (responsesInTrial / timeManager.totalTime).toFixed(2));
      experiment.set('percentCorrectResponses', ((correctResponses / responseNumber)*100).toFixed(2));
      experiment.set('didSwitchToOption2', (didSwitch ? 'YES' : 'NO'));
      experiment.set('didCashOut', (didCashOut ? 'YES' : 'NO'));
      experiment.set('cashEarned', formatAsCurrency(paymentManager.totalPay));
        
      experiment.save();
    },

    render: function(isFirstTime) {
      
      var responsesInTrial = currentExperiment.get('responsesInTrial');

      if(responseNumber >= responsesInTrial) {
        clearKeys();

        paymentManager.totalPay = paymentManager.pay * currentTrialNumber;

        var model = {};

        if(session.get('values').length == 0){
          if(sessions.length == 0){
            new ExperimentDoneView();
            this.undelegateEvents();
            delete this;
            return false;
          }else{
            new ExperimentWaitView();
            this.undelegateEvents();
            delete this;
            return false;
          }
        }

        if(experimentType == 1){
          model = {
            "trials" : currentTrialNumber,
            "payment" : formatAsCurrency(paymentManager.totalPay),
            "instructions" : "Congratulations. You have completed <%= trials %> trials. At the Option 1 rate, you have earned $<%= payment %>. If you would like to continue with the commitment option and begin your next trial, please press ‘Continue with Commitment Option.’ If you would like to switch over to Option 2, please press ‘Switch to No Commitment Option’.",
            "action1" : "continueOption1Experiment",
            "action2" : "switchOption2Experiment",
            "button1" : "Continue with Commitment Option",
            "button2" : "Switch to No Commitment Option"
          }
        } else {
          model = {
            "trials" : currentTrialNumber,
            "payment" : formatAsCurrency(paymentManager.totalPay),
            "instructions" : "Congratulations. You have completed <%= trials %> trial(s). You have earned $<%= payment %>. If you would like to cash out, please press select the option, 'Cash Out'. If you would like to continue on to the next trial, please press 'Continue'.",
            "action1" : "continueOption2Experiment",
            "action2" : "cashOut",
            "button1" : "Continue",
            "button2" : "Cash Out"
          }
        }



        new ExperimentInstructionsView("#experiment-options", model);

        this.delegateEvents();
      
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
      $("#wait-time").countdown('destroy')
      var model = {
        "action1" : "startOption1Experiment",
        "action2" : "startOption2Experiment",
        "button1" : "Option 1: Commitment",
        "button2" : "Option 2: <br/> No Commitment",
        "instructions" : "Select an Option:",
        "centered" : true
      }
      new ExperimentInstructionsView("#experiment-options", model);

      this.undelegateEvents();
      delete this;
    },

    render: function(){
      var template = _.template($('#experiment-wait').html());

      var modelJson = {
        "payment" : formatAsCurrency(paymentManager.totalPay)
      }

      this.$el.html(template(modelJson));

      $("#wait-time").countdown({until: +300, format: "MS"});

      var fiveMinutes = 5 * 60 * 1000;
      _.delay(this.startNewSession, 5000); 
      this.delegateEvents();
    }
  });

  var ExperimentDoneView = Parse.View.extend({
    el: ".content",

    initialize: function(){
      var self = this;
      this.render();
    },

    render: function(){
      this.$el.html(_.template($('#experiment-done').html()));
      this.delegateEvents();
    }
  });


  var ExperimentInstructionsView = Parse.View.extend({
    el: ".content",

    initialize: function(content, model){
      var self = this;
      _.bindAll(this, 'startOption1Experiment', 'continueOption1Experiment', 'continueOption1Experiment', 'startOption2Experiment', 'switchOption2Experiment', 'cashOut');
      this.render(content, model);

    },

    startOption1Experiment: function(){
      startNewSession();
      
      experimentType = 1;  
      new ExperimentView(false, false);
      this.undelegateEvents();
      delete this;
    },

    continueOption1Experiment: function(){
      experimentType = 1;
      new ExperimentView(true, false);
      this.undelegateEvents();
      delete this;
    },

    continueOption2Experiment: function(){
      experimentType = 2;
      new ExperimentView(true, false);
      this.undelegateEvents();
      delete this;
    },

    startOption2Experiment: function(){
      startNewSession();
      experimentType = 2;
      new ExperimentView(false, false);
      this.undelegateEvents();
      delete this;
    },

    switchOption2Experiment: function(model){
      paymentManager.pay = appSettings.option2Pay;
      paymentManager.totalPay = paymentManager.pay * currentTrialNumber;

      newModel = {
        "trials" : model.trials,
        "payment" : formatAsCurrency(paymentManager.totalPay),
        "instructions" : "Congratulations. You have completed <%= trials %> trial(s). At the Option 2 rate, you have earned $<%= payment %>. If you would like to cash out, please press select the option, 'Cash Out'. If you would like to continue on to the next trial, please press 'Continue'.",
        "action1" : "continueOption2Experiment",
        "action2" : "cashOut",
        "button1" : "Continue",
        "button2" : "Cash Out"
      }

      new ExperimentInstructionsView("#experiment-options", newModel);
      this.undelegateEvents();
      delete this;

    },

    cashOut: function(){
      new ExperimentWaitView();
      this.undelegateEvents();
      delete this;
      return false;
    },

    render: function(content, model){
      var self = this;

      if(model.centered == undefined) {
        model.centered = false
      }

      var template = _.template($(content).html());
      this.$el.html(template(model));

      var instructionsTemplate = _.template(model.instructions);

      $('.instructions').html(instructionsTemplate(model));

      var action1ToPerform = model.action1;
      var action2ToPerform = model.action2;

      var button1 = $('.option1');
      button1.html(model.button1);
      button1.click(function() {
       switch (action1ToPerform) {
        case "startOption1Experiment": self.startOption1Experiment(); break;
        case "continueOption1Experiment": self.continueOption1Experiment(); break;
        case "continueOption2Experiment": self.continueOption2Experiment(); break;

       }
      });

      var button2 = $('.option2');
      button2.html(model.button2);
      button2.click(function() {
       switch (action2ToPerform) {
        case "startOption2Experiment": self.startOption2Experiment(); break;
        case "switchOption2Experiment": self.switchOption2Experiment(model); break;
        case "cashOut": self.cashOut(); break;
       }
      });

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
      var model = {
        "action1" : "startOption1Experiment",
        "action2" : "startOption2Experiment",
        "button1" : "Option 1: Commitment",
        "button2" : "Option 2: <br/> No Commitment",
        "instructions" : "Select an Option:",
        "centered" : true
      }
      new ExperimentInstructionsView("#experiment-options", model);
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
