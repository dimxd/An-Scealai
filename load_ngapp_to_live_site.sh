#!/bin/bash

# Use current date in name of backup folder
CURRENT_DATE=`date +"%d_%m_%Y_%T"`

# Create a backup of the live site with the current date in the name
BACKUP_DIR_NAME=./dist/backup_${CURRENT_DATE}
echo "Moving ./dist/an-scealai to ${BACKUP_DIR_NAME}" 
mv ./dist/an-scealai ${BACKUP_DIR_NAME}

echo "Copying ./ngapp/unpublished_dist to ./dist/an-scealai"
cp -r ./ngapp/unpublished_dist ./dist/an-scealai
