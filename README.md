# ringo-sqlite

An [SQLite](http://www.sqlite.org/) client for [RingoJS](http://ringojs.org/) based on the [SqliteJDBC](http://www.zentus.com/sqlitejdbc/) driver.

## Examples

    sqlite = require('ringo-sqlite')
    c = sqlite.open('./test.db')
    
    c.execute('insert into users (name) values (?)', 'joe')
    >> 1 # number of affected rows
    
    c.rowid()
    >> 42

With select, execute returns an iterator:

    iterator = c.execute('select * from users')
    for (row in iterator) print(row)
    >> ['sally', 'sally@example.com', …]
    >> ['mike', 'mike@example.com', …]
    >> ['chris', 'chris@example.com', …]
    >> …
    >> null

Convenience method for selects:

    c.all('select * from users')
    >> [ ['sally', …],
    >>   ['mike', …],
    >>   … ]
    
    c.row('select * from users where name = ?', 'mike')
    >> ['mike', 'mike@example.com', …]
    
    c.column('select name from users')
    >> ['sally', 'mike', 'chris', …]
    
    c.one('select count(*) from users')
    >> 42

Rows are arrays, but also have values accessible by column name:

    row = c.row('select * from users where name = ?', 'mike')
    row.name
    >> 'mike'
    row.email
    >> 'mike@example.com'
    
    row = c.row('select min(age), max(age) as oldest from users')
    row['min(age)']
    >> 18
    row.oldest
    >> 94

Access by column name can be disabled:

    c = sqlite.open('test.db', { column_names: false })
    
    row = c.row('select * from users where name = ?', 'mike')
    row.name
    >>
    row[0]
    >> 'mike'

Autocommit is on by default, but can also be disabled:

    c = sqlite.open('test.db', { autocommit: false })
    
    c.execute('delete from users')
    >> 42
    c.one('select count(*) from users')
    >> 0
    c.rollback()
    c.one('select count(*) from users')
    >> 42
    
    c.execute('update users set password = ? where name = ?', 'secret', 'chris')
    >> 1
    c.commit()
    c.one('select password from users where name = ?', 'chris')
    >> 'secret'

Finally, you can explicitly close the connection:

    c.close()

## License

This module is under the MIT license, and the included SQLite JDBC jar is under the similar ISC license.
