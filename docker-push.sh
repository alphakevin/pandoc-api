#!/bin/sh

DOCKER_REPO=${DOCKER_REPO-alphakevin/pandoc-api}
GIT_BRANCH=${GIT_BRANCH-$(git symbolic-ref --short HEAD)}

if [ $GIT_BRANCH == "master" ]; then
  TAG=latest
else
  TAG=GIT_BRANCH
fi

# echo "docker push $DOCKER_REPO:$TAG ."
docker push $DOCKER_REPO:$TAG .
