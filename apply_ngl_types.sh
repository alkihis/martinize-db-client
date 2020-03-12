cd 

if [ ! -d "/path/to/dir" ]
then
  # Create the NGL repo
  git clone https://github.com/arose/ngl.git
fi

cd ngl

# Refresh the project with the last version
git pull
npm i
git commit -am "Updated NGL"
tsc --emitDeclarationOnly --project tsconfig.json -d --declarationDir types

# Copy the types to the NPM module
cp -R types/* ../martinize-db-client/node_modules/ngl/dist/