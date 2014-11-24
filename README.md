phase
=====
Phase is a Pentaho Analysis Editor - essentially a mondrian schema editor which can be run right from inside the user console of the Pentaho BI Server.

Here's a quick Youtube demonstration of what you can do with Phase:

[https://www.youtube.com/watch?v=2ZRkOkOFjqw&feature=youtu.be](https://www.youtube.com/watch?v=2ZRkOkOFjqw&feature=youtu.be)

The plan is to release phase via the pentaho community marketplace, but some extra work is needed before this makes sense. For interested users and/or developers, here are some quick and dirty setup instructions:

1. download pedis.zip from https://github.com/rpbouman/pedis/raw/master/dist/pedis.zip Install pedis by extracting into the pentaho-solutions/system directory. This will add the Pedis content generator required by Phase.
2. download https://github.com/rpbouman/phase/raw/master/dist/phase.zip Install phase by extracting into the pentaho-solutions/system directory.
3. Restart the pentaho server. You can now open phase from the menu: File > New > Pentaho Analysis Editor

More instructions on how to use will be added to the wiki shortly.
