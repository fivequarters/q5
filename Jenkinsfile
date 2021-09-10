pipeline {
  agent any

  stages('Create env files nessersary') {
    bash tool/cicd/jenkins/scripts/create_env.sh
  }

  stages('Build the stack.') {
    bash tool/cicd/jenkins/scripts/build.sh
  }

  stages('Publish Fusebit image') {
    bash tool/cicd/jenkins/scripts/publish_image.sh
  }

  stages('Deploy Function-API Against CICD') {
    bash tool/cicd/jenkins/scripts/deploy.sh
  }

}