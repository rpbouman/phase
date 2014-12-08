phase
=====
Phase is a Pentaho Analysis Editor - essentially a mondrian schema editor which can be run right from inside the user console of the Pentaho BI Server.

Here's a quick Youtube demonstration of what you can do with Phase:

[https://www.youtube.com/watch?v=2ZRkOkOFjqw&feature=youtu.be](https://www.youtube.com/watch?v=2ZRkOkOFjqw&feature=youtu.be)

Phase is available via the Pentaho marketplace. To install phase, make sure the marketplace plugin is installed. Then, open the Marketplace perspective and install these 2 entries:
1. Pentaho Database Inspection Service (pedis)
2. Pentaho Analysis Editor (phase)
You should restart the server after installing these two items.

You can also manually install Phase by following these instructions:

1. download pedis.zip from https://github.com/rpbouman/pedis/raw/master/dist/pedis.zip Install pedis by extracting into the pentaho-solutions/system directory. This will add the Pedis content generator required by Phase.
2. download https://github.com/rpbouman/phase/raw/master/dist/phase.zip Install phase by extracting into the pentaho-solutions/system directory.
3. Restart the pentaho server. You can now open phase from the menu: File > New > Pentaho Analysis Editor

User documentation is being created and integrated with Phase, and will be avilable from within the Phase application.
