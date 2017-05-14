## README

LINC allows you to seamlessly Server-Side Render your site. We currently only support React/Redux based sites, but sign up for our announcement list at https://bitgenics.io to stay up to date on our Angular 2 and Vue.js efforts.

To start using LINC run `linc init` in your project directory. Just like npm init it will ask you some questions related to your project and install the server-side rendering profile and copy an example configuration file `linc.config.js`. Make the necessary changes to the config file and you are ready for the next step. If you need any help open up an issue here, mail us at `help@bitgenics.io` or post on StackOverflow with tag `linc`.

You can test your configuration file by running a local `linc build`. This will create both a client & server-side version of the code in the `dist` directory. If everything goes well you can run `linc serve` to run a local server at `http://localhost:3000` and look at the code to make everything is fine.

Once everything is working it is time to deploy this to a server. You have a couple of options here. You can host it yourself, possibly with our LINC express middleware, which you can find at: https://github.com/bitgenics/linc-simple-express or deploy it to our server and make use of our free developer tier. Just create a user with `linc user create` and deploy your site with `linc publish`. If you publish for the first time we will ask you what sitename you want to use. Your site will be available at: https://<sitename>.linc-app.co

If you are looking to host your site on Linc properly, get in touch with us and we will set you up with a preview account for our paid tiers, which include custom domain names, monitoring, cached server-side code & client-side assets and much more.

For a more in-depth look at `linc-cli` you will find a page with screenshots for the above at: https://github.com/bitgenics/linc-cli/wiki/Using-Linc

### LINC command line (cli) tools. 

The LINC command line tools enable you to run your website on our Front-End Delivery Network (FDN). 
Installation is easy: simply run 

`npm i linc-cli -g`

to install it on your system. The `-g` flag installs it globally. 

### Feedback and help

I you run into problems, or have other feedback to give us, feel free to drop us a line
at `help@bitgenics.io`.
