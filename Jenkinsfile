pipeline {
  agent any

  stage('Create env files nessersary') {
    bash tool/cicd/jenkins/scripts/create_env.sh
  }

  stage('Build the stack.') {
    bash tool/cicd/jenkins/scripts/build.sh
  }

  stage('Publish Fusebit image') {
    bash tool/cicd/jenkins/scripts/publish_image.sh
  }

  stage('Deploy Function-API Against CICD') {
    bash tool/cicd/jenkins/scripts/deploy.sh
  }

}