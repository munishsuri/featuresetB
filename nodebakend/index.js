const express = require('express');
const cfenv = require('cfenv');
const request = require('request');
const app = express();
const nodemailer = require('nodemailer');

const uascred = cfenv.getAppEnv().getService('uas').credentials;
const clientIdSecret = uascred.clientid + ':' + uascred.clientsecret;

var lastRun = "";
var start =1;

const post_options = {
    url: uascred.url + '/oauth/token?grant_type=client_credentials',
    method: 'POST',
    headers: {
        'Authorization': 'Basic ' + Buffer.from(clientIdSecret).toString('base64'),
        'Content-type': 'application/x-www-form-urlencoded'
    }
};


const businessrulesCred = cfenv.getAppEnv().getService('businessrules_uas').credentials;
const clientIdSecretBusinessRules = businessrulesCred.uaa.clientid + ':' + businessrulesCred.uaa.clientsecret;

const post_options_businessrules = {
    url: businessrulesCred.uaa.url + '/oauth/token?grant_type=client_credentials',
    method: 'POST',
    headers: {
        'Authorization': 'Basic ' + Buffer.from(clientIdSecretBusinessRules).toString('base64'),
        'Content-type': 'application/x-www-form-urlencoded'
    }
};
app.get('/getState', function (req, res1, next) {
    res1.send({state:start});
});
app.get('/start', function (req, res1, next) {
    start = 1;
    res1.send("started");
});

app.get('/stop', function (req, res1, next) {
    start =0;
    res1.send("stopped");
});

app.get('/', function (req, res1, next) {
    res1.send({ val: lastRun });
});

app.get('/getConsumption', function (req, res1, next) {


    request(post_options, (err, res, data) => {
        // 
        if (res.statusCode === 200) {

            const token = JSON.parse(data).access_token;
            console.log(token);
            const get_options = {
                url: uascred.target_url + '/reports/v1/cloudCreditsDetails?viewPhases=CURRENT',
                method: 'GET',
                headers: {
                    'Authorization': 'Bearer ' + token
                }
            };

            // res1.send(token);

            request(get_options, (err, res, data) => {

                res1.send(data);
            });

        }
        else {
            res1.send(err + res + data);

        }
    });


});

app.get('/getConsumptionSubaccount', function (req, res1, next) {


    request(post_options, (err, res, data) => {
        // 
        if (res.statusCode === 200) {

            const token = JSON.parse(data).access_token;
            console.log(token);
            const get_options = {
                url: uascred.target_url + '/reports/v1/monthlySubaccountsCost?fromDate=' + req.query.start + '&toDate=' + req.query.end,
                method: 'GET',
                headers: {
                    'Authorization': 'Bearer ' + token
                }
            };

            // res1.send(token);

            request(get_options, (err, res, data) => {

                res1.send(data);
            });

        }
        else {
            res1.send(err + res + data);

        }
    });
});

var minutes = 10, the_interval = minutes * 60 * 1000;
setInterval(function () {
    var d = new Date();
    lastRun = d.toString();
    request(post_options, (err, res, data) => {
        if (res.statusCode === 200) {

            const token = JSON.parse(data).access_token;
            console.log(token);
            const get_options = {
                url: uascred.target_url + '/reports/v1/cloudCreditsDetails?viewPhases=CURRENT',
                method: 'GET',
                headers: {
                    'Authorization': 'Bearer ' + token
                }
            };

            // res1.send(token);

            request(get_options, (err, res, data) => {
                console.log(data);
                data = JSON.parse(data);
                var phases = data["contracts"][0]["phases"][0].phaseUpdates;
                var value = phases[phases.length - 1].balance;


                request(post_options_businessrules, (err, res, data) => {

                    const token = JSON.parse(data).access_token;
                    var body = {
                        "RuleServiceId": "0d1f038c9096401eb5a68b240b6cf797",
                        "Vocabulary": [
                            {
                                "threshold": {
                                    "value": value
                                }
                            }
                        ]
                    };
                    const checkValueThreshold = {
                        url: businessrulesCred.endpoints.rule_runtime_url + '/rules-service/rest/v2/workingset-rule-services',
                        method: 'POST',
                        headers: {
                            'Authorization': 'Bearer ' + token,
                            'Content-Type': 'application/json'
                        },
                        body: body,
                        json: true
                    };

                    request(checkValueThreshold, (e, r, d) => {
                        console.log(e);
                        console.log(r);
                        console.log(JSON.stringify(d));
                        // const transporter = nodemailer.createTransport({
                        //     host: 'smtp.ethereal.email',
                        //     port: 587,
                        //     auth: {
                        //         user: 'devonte.kshlerin71@ethereal.email',
                        //         pass: 'z6vtGvyDZGhuKWgaxf'
                        //     }
                        // });

                        console.log("jhk" + d.Result[0].threshold.alertreceiver);

                        if (d.Result.length > 0 && start == 1 ) {
                            // transporter.sendMail({
                            //     from: 'noreply_customersuccess_account_btp@sap.com',
                            //     to: d.Result[0].threshold.alertreceiver,
                            //     subject: 'Test Email Subject',
                            //     html: '<h1>Example HTML Message Body</h1>'
                            // }).then(info => {
                            //     console.log('Preview URL: ' + nodemailer.getTestMessageUrl(info));
                            // });   

                            var options = {
                                url: "<yourURL>/cf/producer/v1/resource-events",
                                method: 'POST',
                                auth: {
                                    user: "<user>",
                                    password: "<password>"
                                },
                                json: {
                                    "eventType": "mycustomevent",
                                    "resource": {
                                        "resourceName": "Your Node.js App.",
                                        "resourceType": "app",
                                        "tags": {
                                            "env": "develop environment"
                                        }
                                    },
                                    "severity": "FATAL",
                                    "category": "ALERT",
                                    "subject": "Balance below the Threshold value - Alert",
                                    "body": "The balance of the global account for CPEA internal is low, kindly visit the link and manage the services. ",
                                    "tags": {
                                        "ans:correlationId": "30118",
                                        "ans:status": "CREATE_OR_UPDATE",
                                        "customTag": "42"
                                    }
                                }
                            };

                            request(options, function (error, response, body) {
                                 console.log(error);
                                console.log(response.body);
                            });


                        }
                    });


                });

            });

        }
        else {
            console.log(err + res + data);

        }
    });

    // do your stuff here
}, the_interval);


const port = process.env.PORT || 3000;
app.listen(port, function () {
    console.log('myapp listening on port ' + port);
});