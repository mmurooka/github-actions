const core = require('@actions/core');
const exec = require('@actions/exec');
const github = require('@actions/github');
const io = require('@actions/io');
const path = require('path');

async function bash(cmd)
{
  await exec.exec('bash', ['-c', cmd]);
}

async function run()
{
  try
  {
    dist = core.getInput("dist");
    arch = core.getInput("arch");
    ros_distro = core.getInput("ros-distro");
    cloudsmith_repo = core.getInput("cloudsmith-repo");
    other_gpg_keys = core.getInput("other-gpg-keys").split(' ').filter(x => x.length != 0);
    other_mirrors = core.getInput("other-mirrors").split(' ').filter(x => x.length != 0);

    const context = github.context;
    const repo = context.repo.repo;
    core.exportVariable('REPO', repo);

    const cwd = process.cwd();
    process.chdir(__dirname);

    tag = dist + '-' + arch
    if(ros_distro != '')
    {
      tag += '-' + ros_distro;
    }
    core.exportVariable('DOCKER_TAG', tag);

    if(cloudsmith_repo.length)
    {
      cloudsmith_repo = `curl -1sLf 'https://dl.cloudsmith.io/public/${cloudsmith_repo}/setup.deb.sh' | bash`
    }

    commands = [
      cloudsmith_repo,
      other_gpg_keys.map(x => 'apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-key ' + x).join(' \\&\\& '),
      other_mirrors.map(x => "echo 'deb " + x + " " + dist + " main' | tee -a /etc/apt/sources.list").join(' \\&\\& ')
    ].filter(x => x.length != 0).join(' \\&\\& ');
    if(commands.length != 0)
    {
      core.exportVariable('EXTRA_SETUP_COMMANDS', commands);
    }

    // Setup DEBFULLNAME
    DEBFULLNAME = process.env.DEBFULLNAME ? process.env.DEBFULLNAME : 'JRL/IDH Continuous Integration Tool';
    if(!process.env.DEBFULLNAME)
    {
      core.exportVariable('DEBFULLNAME', DEBFULLNAME);
    }

    // Setup DEBEMAIL
    DEBEMAIL = process.env.DEBEMAIL ? process.env.DEBEMAIL : 'jrl-idh+ci@gmail.com';
    if(!process.env.DEBEMAIL)
    {
      core.exportVariable('DEBEMAIL', DEBEMAIL);
    }

    await bash("./docker-and-build.sh");

    process.chdir(cwd);
  }
  catch(error)
  {
    core.setFailed(error.message);
  }
}

run();
