## README

LINC allows you to seamlessly Server-Side Render your site. 

### Installation

The LINC command line tools enable you to run your website on our Front-End Delivery Network (FDN). Installation is easy: simply run 

`npm i linc-cli -g`

to install it on your system. The `-g` flag installs it globally. 

Please be aware that LINC needs node version 8 to run. You can easily switch to node 8 if you're using `nvm` (node version manager). 

### Configuration

To start using LINC run `linc init` in your project directory. Just like npm init it will ask you some questions related to your project, install the server-side rendering profile, and copy an example configuration file `linc.config.js`. Make the necessary changes to the config file and you are ready for the next step. If you need any help open up an issue on GitHub, mail us at `help@bitgenics.io` or jump onto https://www.bitgenics.io and contact us via our chat app.

### Building/Running a SSR bundle locally

You can test your site locally by running `linc build`. This will create both a client & server-side version of the code in the `dist` directory. If everything goes well you can run `linc serve` to run a local server at `http://localhost:3000` and look at the result to make sure everything is fine.

### Deploying

Once everything is working it is time to deploy this to a server. You have a couple of options here. You can host it yourself or deploy it to our server and make use of our free developer tier. Just create a user with `linc user create` and deploy your site with `linc publish`. If you publish for the first time we will ask you what sitename you want to use. Your site will be available at: https://your-site.linc-app.co.

If you are looking to host your site on LINC properly, you can sign up to our paid plans, which include custom domain names, monitoring, cached server-side code & client-side assets, and much more. Plans start at US$99/mo.

For a more in-depth look at `linc-cli` you will find a page with screenshots for the above at: https://github.com/bitgenics/linc-cli/wiki/Using-LINC

### Feedback and help

If you run into problems or have other feedback to give us, feel free to drop us a line at <a href="mailto:help@bitgenics.io">help@bitgenics.io</a> or visit us at https://www.bitgenics.io/ to chat with us between the hours of 9 - 5 weekdays. Alternately if you would like to book time to talk with one of our technical support engineers, please do so [here](https://calendly.com/bitgenics/technical-support/) 
