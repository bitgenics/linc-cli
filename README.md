## README

LINC command line (cli) tools. 

The LINC command line tools enable you to run your website on our Front-End Delivery Network (FDN). 
Installation is easy: simply run 

`npm i linc-cli -g`

to install it on your system. The `-g` flag installs it globally. 

### Usage

`linc -h` will show you the available commands. 

![alt text](https://cloud.githubusercontent.com/assets/468748/25603031/121524c6-2f2b-11e7-8c73-f9bfbe1e5428.png "linc usage")

If a command has subcommands, like `linc domain`, 
simply add -h to show the options for the subcommand, like so: 

`linc domain -h`

### First use

If you're new to LINC, you first need to create an account. In order to do this, simply run
`linc user create`. You will be asked to enter your email address. If you've already signed 
up at some point, an error message will be shown. Otherwise, you will see a welcome message 
and your credentials. These credentials are stored in `~/.linc/credentials`, but you should 
also store them in a secure location, as we cannot recover your credentials. (Should you 
ever run into trouble, just send and email to `help@bitgenics.io`.)

Once we know who you are, you can start using LINC to deploy your website. 

### Creating a site

Creating a site is easy too. Just run `linc init` in a directory that is set up as an npm
package (meaning that at some point you've run `npm init` to create `package.json`). This
command will run you through a couple of questions about your site (look at it as a project).
At this point, you will only need to provide information that is necessary to use LINC 
locally. After initialising, you can build your site using `linc build`, and run it locally
from your machine using `linc serve`. 

![alt text](https://cloud.githubusercontent.com/assets/468748/25793768/9d298212-3400-11e7-9685-5872d3916338.png "linc init")

Once you've entered these settings, you will be shown the information
that will be added to your `package.json`: 

![alt text](https://cloud.githubusercontent.com/assets/468748/25793968/7c1a669e-3401-11e7-8700-dfa1283c6f6e.png
 "linc section in package.json")

If you're happy with the settings, simply press  enter (the default is to accept). Otherwise, 
type `N <enter>` or Ctrl-C and start over.

If you've answered Y, your `package.json` will be updated, and example configuration files
will be copied into your source directory. 

![alt text](https://cloud.githubusercontent.com/assets/468748/25793773/a19e0ffc-3400-11e7-8139-54136a7be9d5.png "linc init")

### Building your site

In order to deploy your site, you first need to build it. Inside your project directory,
type `linc build`. It takes a few moments to finish the build, so please be patient. The
result of the build is a directory called `dist`, which contains the information we need
to ultimately deploy your site. 

![alt text](https://cloud.githubusercontent.com/assets/468748/25605385/0a5c948c-2f3d-11e7-8636-271d066a9028.png "linc build")

### Run your new site locally

You can run your new build using the command `linc serve`. It will start a web server on
your machine, listening on port 3000 (`http://localhost:3000`).

![alt text](https://cloud.githubusercontent.com/assets/468748/25605400/26610d02-2f3d-11e7-95ec-862ea80043f7.png "linc serve")

### Publishing your site

In order to actually use your site, you'll need to publish it. Publishing is as easy as
running `linc publish`. This will create a zip-file of your `dist` directory, and upload 
it to our servers. Depending on your internet connection, this may take a few moments. 
Once the upload has finished, you will be notified, and your deployment's main information 
will be shown. Deployments are uniquely identified using a so-called deployment key, which 
is based on your actual website code, the site name, and the settings that you choose to
use with your site. A deployment URL is shown, which you can use to access the site after
it has been published. It may take a few moments for your latest deployment to become 
available.

![alt text](https://cloud.githubusercontent.com/assets/468748/25605419/3d311d7e-2f3d-11e7-8adb-b09d0e48b8d1.png "linc deploy")

### Custom domains

You can add custom domains during initialisation or at a later time. If you haven't added
custom domains during initialisation yet, you can use `linc domain add` to add one. This 
command will add a custom domain to your site. Also, it will trigger sending an email (or
emails if you have multiple custom domains) to validate an SSL Certificate. Make sure to 
validate the SSL Certificate in order to enable a secure connection with your site using
custom domains. 

![alt text](https://cloud.githubusercontent.com/assets/468748/25605433/53a1a33a-2f3d-11e7-945f-5f837eb3712a.png
 "linc domain add")

To see what domains are available for your site, run `linc domain list`.

### Release a version for your site

Releasing a new version for your site, means coupling a certain deployment (based on its
unique deployment ID) with a custom domain you've added. Simply run `linc release` and 
answer a few questions: a) the domain(s) to release to and b) which deployment key to use.

![alt text](https://cloud.githubusercontent.com/assets/468748/25605465/852d3a36-2f3d-11e7-908d-1408b22463ec.png
 "linc release")

Once you've released to a certain custom domain, you can use that domain for your site. 
If you want to release again, simply re-run `linc release`, and choose a different 
deployment key. 

Please note that the latest deployment of your site can always be found at the special
site url `https://<site-name>.linc-app.co`.

## Feedback and help

I you run into problems, or have other feedback to give us, feel free to drop us a line
at `help@bitgenics.io`.
