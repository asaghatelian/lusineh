function doExport(applicant, data) {
	// prepare CSV data
	var csvData = new Array();
	csvData.push('"ID #","Gender","Age","Years Edu","Practice Total Time","Practice Trials to Criterion","Session #","VR Schedule","Initial Selection","Trial #","# Responses Required in this Trial","Response #","Response (Correct = 1 or Incorrect = 0)","Pre-ratio Pausing (seconds)","Inter-Trial Interval","Total Time Elapsed","Rate per Response (End of Trial)","% Correct Responses (End of Trial)","Did participant switch to Option 2?","Did participant cash out?","Cash Earned"');

	if(applicant == undefined){
		return false;
	}
	data.forEach(function(item, index, array) {
  		csvData.push('"' + getValidData(applicant.applicantId) + '","' + getValidData(applicant.sex) + '","' + getValidData(applicant.age) + '","' + getValidData(applicant.education) + '","' + getValidData(applicant.practiceTime) + '","' + getValidData(applicant.practiceTries) + '",  "' + getValidData(item.sessionNumber) + '",  "' + getValidData(item.vrSchedule) + '",  "' + getValidData(item.initialSelection) + '",  "' + getValidData(item.trialNumber) + '",  "' + getValidData(item.responsesInTrial) + '",  "' + getValidData(item.responseNumber) + '",  "' + getValidData(item.response) + '",  "' + getValidData(item.preRatioPausing) + '",  "' + getValidData(item.interTrialInterval) + '",  "' + getValidData(item.totalTime) + '",  "' + getValidData(item.ratePerResponse) + '",  "' + getValidData(item.percentCorrectResponses) + '",  "' + getValidData(item.didSwitchToOption2) + '",  "' + getValidData(item.didCashOut) + '",  "' + getValidData(item.cashEarned) + '"');
	});
  	
	var fileName = "data-" + applicant.applicantId + ".csv";
	var buffer = csvData.join("\n");
	var blob = new Blob([buffer], {
	  "type": "text/csv;charset=utf8;"      
	});

    var url = window.URL.createObjectURL(blob);
    window.open(url);

}

function getValidData(data) {
	if(data == undefined || data == null){
		return '';
	}
	return data;
}

