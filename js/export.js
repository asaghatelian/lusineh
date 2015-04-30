var saveData = (function(){
    var a = document.createElement("a");
    document.body.appendChild(a);
    a.style = "display: none";

    return function (data, fileName) {
    var buffer = data.join("\n");

        var blob = new Blob([buffer], 
          {type: "text/csv;charset=utf8;"}),
            url = window.URL.createObjectURL(blob);
        a.href = url;
        a.download = fileName;
        a.click();
        window.URL.revokeObjectURL(url);
    };
}());

function doExport(applicant, data) {
	// prepare CSV data
	var csvData = new Array();
	csvData.push('"ID #","Gender","Age","Years Edu","Practice Total Time","Practice Trials to Criterion","Session #","VR Schedule","Initial Selection","Trial #","# Responses Required in this Trial","Response #","Response (Correct = 1 or Incorrect = 0)","Pre-ratio Pausing (seconds)","Inter-Trial Interval","Total Time Elapsed","Rate per Response (End of Trial)","% Correct Responses (End of Trial)","Did participant switch to Option 2?","Did participant cash out?","Cash Earned"');

	if(applicant == undefined){
		return false;
	}
	data.forEach(function(item, index, array) {
    csvData.push('"' + getValidData(applicant.applicantId) + '","' + getValidData(applicant.sex) + '","' + getValidData(applicant.age) + '","' + getValidData(applicant.education) + '","' + getValidData(applicant.practiceTime) + '","' + getValidData(applicant.practiceTries) + '",  "' + getValidData(item.get("sessionNumber")) + '",  "' + getValidData(item.get("vrSchedule")) + '",  "' + getValidData(item.get("initialSelection")) + '",  "' + getValidData(item.get("trialNumber")) + '",  "' + getValidData(item.get("responsesInTrial")) + '",  "' + getValidData(item.get("responseNumber")) + '",  "' + getValidData(item.get("response")) + '",  "' + getValidData(item.get("preRatioPausing")) + '",  "' + getValidData(item.get("interTrialInterval")) + '",  "' + getValidData(item.get("totalTime")) + '",  "' + getValidData(item.get("ratePerResponse")) + '",  "' + getValidData(item.get("percentCorrectResponses")) + '",  "' + getValidData(item.get("didSwitchToOption2")) + '",  "' + getValidData(item.get("didCashOut")) + '",  "' + getValidMoneyData(item.get("cashEarned")) + '"');	
  });

	var fileName = "data-applicant-" + applicant.applicantId + ".csv";
 	saveData(csvData, fileName);
}

function getValidData(data) {
	if(data == undefined || data == null){
		return '';
	}
	return data;
}

function getValidMoneyData(data) {
  if(data == undefined || data == null){
    return '';
  }
  return "$" + parseFloat(data, 10).toFixed(2);
}
