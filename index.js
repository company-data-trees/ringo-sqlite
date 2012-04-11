var fs = require('fs');
var {merge} = require('ringo/utils/objects');

var jar = fs.resolve(module.path, './jars/sqlitejdbc-v056.jar');
addToClasspath(jar);

var dm = java.sql.DriverManager;
dm.registerDriver(new org.sqlite.JDBC);

var Connection = function(path, options) {
    options = merge(options, {
        autocommit: true,
        column_names: true
    });

    this.column_names = options.column_names

    this.connection = dm.getConnection('jdbc:sqlite:' + path);
    this.connection.setAutoCommit(options.autocommit);
}

function prepare_statement(s, values) {
    values.forEach(function(value, index) {
        switch (typeof value) {
            case 'undefined':
                s.setNull(index + 1);
            case 'number':
                (parseFloat(value) == parseInt(value)) ?
                    s.setLong(index + 1, value) :
                    s.setDouble(index + 1, value);
                break;
            case 'boolean':
                s.setBoolean(index + 1, value);
                break;
            case 'object':
                if (value === null) {
                    s.setNull(index + 1);
                    break;
                }

                if (value instanceof Date) {
                    s.setDate(index + 1, new java.sql.Date(value));
                    break;
                }

                // otherwise, fall through to string default
            case 'string':
            default:
                s.setString(index + 1, value);
        }
    });
}

var {NULL, INTEGER, FLOAT, VARCHAR} = java.sql.Types;
function wrap_result(result_set, column_names) {
    var metadata = result_set.getMetaData();
    var column_count = metadata.getColumnCount();

    while (metadata.next()) {
        var row = [];

        for (var i = 1; i <= column_count; i++) {
            var type = metadata.getColumnType(i);
            var value = null;

            switch (type) {
                case NULL:
                    break;
                case INTEGER:
                    value = result_set.getLong(i);
                    break;
                case FLOAT:
                    value = result_set.getDouble(i);
                    break;
                case VARCHAR:
                default:
                    value = result_set.getString(i);
            }

            if (value !== null && result_set.wasNull())
                value = null;

            row.push(value);

            if (column_names) {
                var name = metadata.getColumnName(i);
                row[name] = value;
            }
        }

        yield row;
    }

    result_set.getStatement().close();
    yield null;
}

Connection.prototype.execute = function(query) {
    var statement = this.connection.prepareStatement(query);
    var args = Array.prototype.slice.call(arguments, 1);
    prepare_statement(statement, args);

    if (!statement.execute()) {
        // either an update or no result
        var count = statement.getUpdateCount();
        statement.close();
        return (count > -1) ? count : undefined;
    }

    var iterator = wrap_result(
        statement.getResultSet(),
        this.column_names
    );
    iterator.close = function() { statement.close(); }

    return iterator;
}

Connection.prototype.close = function() {
    this.connection.close();
}

Connection.prototype.commit = function() {
    this.connection.commit();
}

Connection.prototype.rollback = function() {
    this.connection.rollback();
}

Connection.prototype.all = function() {
    var args = Array.prototype.slice.call(arguments);
    var iterator = this.execute.apply(this, args);

    var rows = [];
    for (var row in iterator) {
        if (row !== null) rows.push(row);
    }

    return rows;
}

Connection.prototype.column = function() {
    var args = Array.prototype.slice.call(arguments);
    var iterator = this.execute.apply(this, args);

    var rows = [];
    for (var row in iterator) {
        if (row !== null) rows.push(row[0]);
    }

    return rows;
}

Connection.prototype.row = function() {
    var args = Array.prototype.slice.call(arguments);
    var iterator = this.execute.apply(this, args);

    var row = iterator.next();
    iterator.close();

    return row;
}

Connection.prototype.one = function() {
    var args = Array.prototype.slice.call(arguments);
    var iterator = this.execute.apply(this, args);

    var row = iterator.next() || [null];
    iterator.close();

    return row[0];
}

Connection.prototype.rowid = function() {
    return this.one('select last_insert_rowid()');
}

exports.open = function(path, options) {
    return new Connection(path, options);
}
