# Developer collaboration using GitHub

## First smart contract set

Let's say you have deployed Smart Contract Sets 1 (SCS1) with any template set and made your changes there.

### Initializing the repository

Select the VCS panel in the sidebar of the IDE, and press the `Initialize Repository` button.

![Initialize Repository](images/github-01.png)

Then stage and commit all files.

![Stage and commit all files](images/github-02.png)

### Push the code to GitHub

Create a (private) repository on GitHub.

![New GitHub repository](images/github-03.png)

> Note that the IDE has built in `Publish to GitHub` capabilities, but this will not allow you to publish to an organization.

Press `cmd+shift+p` for mac and `ctrl+shift+p` for windows, and enter “Add Remote”

![](images/github-04.png)

Then choose "Add remote from GitHub". This will prompt a login to GitHub.

![](images/github-05.png)

Search for your repository name, in our case `settlemint/github-` is enough to get it to autocomplete the repository.

![](images/github-06.png)

And name the remote as `origin`. (this is not required to be origin, but it is a convention)

![](images/github-07.png)

Lastly, `cmd+shift+p` for mac and `ctrl+shift+p` for windows and search for the `Push to...` option

![](images/github-08.png)

And select the `origin` remote.

![](images/github-09.png)

If you check GitHub again, you will see the commit and files in the repository.

![](images/github-10.png)

At this point, your `main` branch is configured to automatically push to this origin, so all the sync options in the VCS tab work without further configuration. 

## Second smart contract set

Now, if another developer wants to work on top of your changes on the above published repository, they need to follow the below steps.

Deploy the smart contract sets by selecting the Empty template and initialize the repository like we did for SCS1

Select the VCS panel in the sidebar of the IDE, and press the `Initialize Repository` button.

![Initialize Repository](images/github-01.png)

Press `cmd+shift+p` for mac and `ctrl+shift+p` for windows, and enter “Add Remote”

![](images/github-04.png)

Then choose "Add remote from GitHub". This will prompt a login to GitHub.

![](images/github-05.png)

Search for your repository name, in our case `settlemint/github-` is enough to get it to autocomplete the repository.

![](images/github-06.png)

And name the remote as `origin`. (this is not required to be origin, but it is a convention)

![](images/github-07.png)

Next we need to get the repo in a state that we can pull in the GitHub repository. Go to the VCS tab and select all files and `Discard Changes`.

![](images/github-11.png)

What this does is it removes all the files from the local repository. But since it also removes the `.gitignore` file, it will complain about a few things:

- it will tell you tha tyou are doing this on a branch with no commits yet. This is expected and can be ignored
- then it will also tell you there are too many changes, since all the generated files and node_module folder is now no longer ignored. Again, not an issue, just close them.

Then it is time to press `cmd+shift+p` for mac and `ctrl+shift+p` for windows and search for the `Pull from...` option.
Use the same login / search / origin flow as described above. 

You will end up with no changes and all files from GitHub in your file explorer view. You can now commit, pull and push and work together with your colleagues. 

![](images/github-12.png)
