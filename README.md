## README

LINC command line (cli) tools. 

The LINC command line tools enable you to run your website on our Front-End Delivery Network (FDN). 
Installation is easy: simply run 

`npm i linc-cli -g`

to install it on your system. The `-g` flag installs it globally. 

### Usage

`linc -h` will show you the available commands. 

![alt text](https://cloud.githubusercontent.com/assets/468748/25794513/d32e6bd6-3403-11e7-9258-f371c546f15b.png "linc usage")

If a command has subcommands, like `linc domain`, 
simply add -h to show the options for the subcommand, like so: 

`linc domain -h`

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

### Create a new user

So far, you've been able to use LINC without "going on the internet". This is about to 
change, since you'll want to publish your site. Before you can publish your site, you'll
need to create a new user. Simply type the command `linc user create`. Next, you'll be
asked for your email address. After registering your email address, you'll receive the
credentials you need to use LINC online (these credentials are also saved in 
`~/.linc/credentials`). Please save these credentials in a safe place, since we cannot
retrieve them at any time. 

![alt text](https://cloud.githubusercontent.com/assets/468748/25796953/032889a2-340e-11e7-81c3-1d5fef8f0a9d.png "linc user create")

Should you ever run into trouble, just send and email to `help@bitgenics.io`.)

### Publishing your site

In order to actually use your site, you'll need to publish it. Publishing is as easy as
running `linc publish`. This will create a zip-file of your `dist` directory, and upload 
it to our servers. Depending on your internet connection, this may take a few moments. 

#### When this is the first time you publish

The very first time you run this command, you'll be asked some more questions about your
site. This information we need to set up your site on our servers. You'll be asked for
a name, which should be unique (we check, don't worry), a description of your site,
where the error pages are or should be stored, and the viewer protocol. If you wish to
do so, you can also add custom domain names. 

![alt text](https://cloud.githubusercontent.com/assets/468748/25799781/039b3758-3419-11e7-9c7d-b69fbe14920a.png "linc publish")

LINC will now show you the changes that will be made to `package.json` and ask you if
this looks okay. If not, press N, No, or Ctrl-C, and the command will terminate. Otherwise,
type Y (or Enter). 

![alt text](https://cloud.githubusercontent.com/assets/468748/25799787/0a6fb446-3419-11e7-86f4-47708be8cf5c.png "linc publish")

LINC will contact our servers to set up your site. You'll get an error message if
anything goes wrong, but otherwise it will give you the information about your site 
that you'll need in a later stage, like the site URL. (You'll use this URL to point 
custom domains to.)

Immediately after setting up your site, the site package will be uploaded. LINC will 
tell you the location where you can access it (you don't need to use custom domains
at this stage). 

![alt text](https://cloud.githubusercontent.com/assets/468748/25799795/1066a21a-3419-11e7-80b2-d61a032e3268.png "linc publish")

Once the upload has finished, you will be notified, and your deployment's main information 
will be shown. Deployments are uniquely identified using a so-called deployment key, which 
is based on your actual website code, the site name, and the settings that you choose to
use with your site. A deployment URL is shown, which you can use to access the site after
it has been published. It may take a few moments for your latest deployment to become 
available.

![alt text](https://cloud.githubusercontent.com/assets/468748/25605419/3d311d7e-2f3d-11e7-8adb-b09d0e48b8d1.png "linc deploy")

#### When you've published before

If you've published your site before, naturally we don't have to ask you any more questions.
After authorisation, your site will be uploaded immediately. When the upload has finished,
you'll be given the URL to access your site, exactly as described before. 

![alt text](https://cloud.githubusercontent.com/assets/468748/25800491/274e94e4-341c-11e7-9bb6-9c7718a2e3c0.png "linc deploy")

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
