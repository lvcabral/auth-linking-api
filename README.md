# Authentication and Linking API for Roku Channels

## Description
This NodeJS app implements a simple server-side authentication and linking API for a Roku Channel. It was implemented to work together with the sample channel provided by Roku at their [GitHub repository](https://github.com/rokudev/). Download the source code for the Roku channel at [Authentication and Linking Sample](https://github.com/rokudev/sample-channels/blob/master/auth-linking-channel.zip)

## API Documentation
1.	(get) /generate?token=[device id]  
    Returns a json with the temporary activation code and the expiration period (900s default)
2.	(get) /authenticate?token=[device id]  
    Returns the OAuth token associated to the device id provided. (returns an empty string for invalid ids)
3.	(get) /disconnect?token=[device id]
    Returns a json indicating the success of the disconnect operation
4.	(post) /activate  
    Endpoint to the form where the user enter the activation key
5.	(get) /browse -- DEBUG mode only  
    Shows a page with a list of the codes and a list of tokens from the database

## Prerequisites
* MongoDB is required to run this application, if you want to test it you can [create a sandbox at mLab.com](https://mlab.com/plans/pricing/#plan-type=sandbox).
* NodeJS / NPM must be already installed on your machine before running this app.

**NodeJS / NPM Installation**

- Install Node from the [Node.js](https://nodejs.org/en/) website.
- Verify it is installed correctly with the following at your command line:

```shell
$ npm -v
# (should return a version number)
```

## Usage
Follow these steps to build & run the app

1: Clone repo
```shell
$ git clone git@github.com:lvcabral/auth-linking-api.git
```

2: Install packages
```shell
$ npm install
```

3: Update MongoDB connection

Edit **server.js** file and configure your MongoDB connection string at **line 34**.
```JavaScript
    MongoClient.connect('mongodb://<user>:<password>@<server>/<database>', (err, database) => {
```
3: Run it
```shell
$ node server.js
```
If you want to deploy it you can also package it with [Gulp](http://gulpjs.com/) (optional)
```shell
$ touch gulpfile.js
```

4: Update Roku Channel

Edit channel source-code **/components/SimpleScene.brs** 

**Lines 24-26**: Replace the server info with the API endpoints URL
```BrightScript
  m.gen = "http://YOUR-SERVER-URL:3000/generate?token=" + m.rokuDeviceID
  m.auth = "http://YOUR-SERVER-URL:3000/authenticate?token=" + m.rokuDeviceID
  m.dis = "http://YOUR-SERVER-URL:3000/disconnect?token=" + m.rokuDeviceID
```

**Line 74**: Replace server info with the activation page URL
```BrightScript
  m.HowTo.text = "Go to 'http://YOUR-SERVER-URL:3000/activate' on a web browser and enter the following code to connect:"
```

**Line 30** from the file **/components/SimpleScene.xml** replace server info with the activation page URL
```XML
<Label
      id="HowTo"
      font="font:MediumBoldSystemFont"
      height="1000"
      width="1000"
      wrap="true"
      text="Go to 'http://YOUR-SERVER-URL:3030/activate' on a web browser and enter the following code to connect:"
      translation="[500,470]" />
```

## License

Copyright (c) 2017 Marcelo Lv Cabral. All Rights Reserved.

Licensed under the [MIT](LICENSE.txt) License.
