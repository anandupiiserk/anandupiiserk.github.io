Put your photographs in this folder and list each one in captions.txt.

File names (the numbers have 3 digits, so you can go past 999 as 1000, 1001 and so on):
  PhD_001.jpg      PhD section
  Conf_001.jpg     Conference section
  WORK_001.jpg     Workshops section
  Meet_001.jpg     Meetings section
  Field_001.jpg    Field section
  Visit_001.jpg    Visit section (research visits)
  MSpace_001.jpg   My Space section

Several photos of one event: Conf_012_01.jpg, Conf_012_02.jpg, ... up to _20.
List the event once in captions.txt as:  Conf_012 | Caption

Keep the capital letters exactly as above: GitHub Pages treats PhD_001.jpg and phd_001.jpg as different files.
After you upload the files and the edited captions.txt to GitHub, the gallery updates by itself. No other file needs to change.

SPEED NOTE
gallery/t/ holds light WebP copies used for the tiles and gallery/manifest.json lists every photo.
After adding or renaming photos, both must be regenerated (python3 build_gallery.py), otherwise new photos will not appear.
