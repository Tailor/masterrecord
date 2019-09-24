
// https://github.com/kriasoft/node-sqlite
// https://www.learnentityframeworkcore.com/dbset/deleting-data

var modelBuilder  = require('masterrecord/Entity/EntityModelBuilder');
var query = require('masterrecord/QueryLanguage/queryBuilder');
var tools =  require('./Tools');
var SQLEngine  = require('./SQLEngine');

class Context {

    _isModelValid = {
        isValid: true,
        errors: []
    }
    __allContexts = [];
    __trackedEntities = [];
    __relationshipModels = []

    constructor(){
        this._SQLEngine = new SQLEngine();
    }

    __SQLiteInit(env, sqlName, name){
        const sqlite3 = require(sqlName);
        let DBAddress = env.connection + name + ".sqlite3";
        var db = new sqlite3(DBAddress, env);
        db.__name = sqlName;
        return db;
    }

    setup(env, name){
        if(env.type !== undefined){
            switch(env.type) {
                case "better-sqlite3":
                    this.db = this.__SQLiteInit(env, env.type, name);
                    this._SQLEngine.setDB(this.db);
                    return this;
                break;
            }
        }
    }
    
    validateEntity(currentModel){
        for(var entity in currentModel.__entity) {
            var currentEntity = currentModel.__entity[entity];
            if (currentModel.__entity.hasOwnProperty(entity)) {
                // TODO: // check if types are correct
                if(currentEntity.default !== undefined){
                    if(!currentModel[entity]){
                        currentModel[entity] = currentEntity.default;
                    }
                }
                if(currentEntity.primary === true){
                    // skip it from the insert
                    delete currentModel[`_${entity}`];
                }
                if(currentEntity.virtual === true){
                    // skip it from the insert
                    delete currentModel[`_${entity}`];
                }
                if(currentEntity.required === true){
                    if(!currentModel[entity]){
                        this._isModelValid.isValid = false;
                        this._isModelValid.errors.push( `Entity ${entity} is a required Field`);
                        console.log(`Entity ${entity} is a required Field`);
                    }
                }
            }

        }
    }

    dbset(model){
        var validModel = modelBuilder.init(model);
        validModel.__name = model.name;
        this.__allContexts.push(validModel);
        this.createNewInstance(validModel);
    }

    createNewInstance(validModel){
        this[validModel.__name] = new query(validModel, this);
    }

    modelState(){
        return this._isModelValid;
    }

    saveChanges(){
        
        for (var model in this.__trackedEntities) {
            var currentModel = this.__trackedEntities[model];
            this.validateEntity(currentModel);
            if(this._isModelValid.valid === false){
                // everything great
                console.log(JSON.stringify(this._isModelValid.valid.errors));
            }

            switch(currentModel.__state) {
                case "modified":
                    if(currentModel.__dirtyFields.length <= 0){
                        throw "Tracked entity modified with no values being changed";
                    }
                    // build columns equal to value string 
                    var argu = tools.buildSQLEqualTo(currentModel);
                    var primaryKey  = tools.getPrimaryKeyObject(currentModel.__entity);
                    var sqlUpdate = {tableName: currentModel.__entity.__name, arg: argu, primaryKey : primaryKey, value : currentModel[primaryKey] };
                    this._SQLEngine.update(sqlUpdate);
                  // code block
                  break;
                case "insert":
                    // TODO: skip virtual
                    var insertObj =  tools.getInsertObj(currentModel);
                    var sqlUpdate = {tableName: currentModel.__entity.__name, columns: insertObj.columns, values: insertObj.values };
                    this._SQLEngine.insert(sqlUpdate);
                  break;
                case "delete":
                    var primaryKey  = tools.getPrimaryKeyObject(currentModel.__entity);
                    var sqlUpdate = {tableName: currentModel.__entity.__name, primaryKey : primaryKey, value : currentModel[primaryKey] };
                    this._SQLEngine.delete(sqlUpdate);
                  break;
              }

        }
        this.__trackedEntities = [];
        return true;
    }

    __Track(model){
        this.__trackedEntities.push(model);
        return model;
    }

    __FindTracked(id){
        if(id){
            for (var model in this.__trackedEntities) {
                if(this.__trackedEntities[model].__ID === id){
                    return this.__trackedEntities[model];
                }
            }
        }
        return null;
    }
}

module.exports = Context;