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

  // Global Variables
  var sessions = null;
  var practiceCount = 0;
  
  var keys = ['up','down','left','right'];
  var keyCode = ['38', '40', '37', '39'];

  var AppState = Parse.Object.extend("AppState", {
    defaults: {
      filter: "all"
    }
  });

  var PracticeView = Parse.View.extend({
    el: ".content",

    currentKey: '',

    initialize: function() {
      KeyboardJS.on('up', this.onUpKey);
      KeyboardJS.on('down', this.onDownKey);
      KeyboardJS.on('left', this.onLeftKey);
      KeyboardJS.on('right', this.onRightKey);
      currentKey = Math.round(Math.random()*3);

      this.render();
    },

    onUpKey: function(a) { // keycode 38
      if(keyCode[currentKey] == a.keyCode){
        alert('success!')
      } else{
        alert('failure!')
      }
    },

    onDownKey: function(a) { // keycode 40
      if(keyCode[currentKey] == a.keyCode){
        alert('success!')
      } else{
        alert('failure!')
      }
    },

    onLeftKey: function(a) { // keycode 37
      if(keyCode[currentKey] == a.keyCode){
        alert('success!')
      } else{
        alert('failure!')
      }
    },

    onRightKey: function(a) { // keycode 39
      if(keyCode[currentKey] == a.keyCode){
        alert('success!')
      } else{
        alert('failure!')
      }
    },

    render: function() {
      this.$el.html(_.template($("#practice").html()));
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
      //_.bindAll(this, "");
      this.render();
    },

    continueToPractice: function() {
      
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
          self.$(".signup-form button").attr("disabled", "");
          new PracticeInstructoinsView();
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
      new PracticeView();
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
      sessionQuery.find({
        success: function(results) {
          sessions = results;
        },
        error: function(error) {
          alert(error);
        }
      });
    },

  });

  var state = new AppState;

  new AppRouter;
  new AppView;

  Parse.history.start();

});
