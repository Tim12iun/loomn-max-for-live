{
 "patcher": {
  "fileversion": 1,
  "appversion": {
   "major": 8,
   "minor": 6,
   "revision": 0,
   "architecture": "x64",
   "modernui": 1
  },
  "classnamespace": "box",
  "rect": [
   100,
   100,
   1200,
   600
  ],
  "bglocked": 0,
  "openinpresentation": 1,
  "default_fontsize": 12.0,
  "default_fontface": 0,
  "default_fontname": "Arial",
  "gridonopen": 1,
  "gridsize": [
   15.0,
   15.0
  ],
  "gridsnaponopen": 1,
  "toolbarvisible": 1,
  "boxes": [
   {
    "box": {
     "id": "o1",
     "maxclass": "newobj",
     "numinlets": 2,
     "numoutlets": 2,
     "patching_rect": [
      20,
      20,
      60,
      22
     ],
     "outlettype": [
      "signal",
      "signal"
     ],
     "text": "plugin~"
    }
   },
   {
    "box": {
     "id": "o2",
     "maxclass": "newobj",
     "numinlets": 2,
     "numoutlets": 2,
     "patching_rect": [
      20,
      300,
      60,
      22
     ],
     "outlettype": [
      "signal",
      "signal"
     ],
     "text": "plugout~"
    }
   },
   {
    "box": {
     "id": "o3",
     "maxclass": "newobj",
     "numinlets": 1,
     "numoutlets": 3,
     "patching_rect": [
      150,
      20,
      100,
      22
     ],
     "outlettype": [
      "bang",
      "int",
      "int"
     ],
     "text": "live.thisdevice"
    }
   },
   {
    "box": {
     "id": "o4",
     "maxclass": "newobj",
     "numinlets": 0,
     "numoutlets": 1,
     "patching_rect": [
      270,
      20,
      90,
      22
     ],
     "outlettype": [
      ""
     ],
     "text": "r ---sortfromweb"
    }
   },
   {
    "box": {
     "id": "o5",
     "maxclass": "newobj",
     "numinlets": 1,
     "numoutlets": 2,
     "patching_rect": [
      150,
      90,
      140,
      22
     ],
     "outlettype": [
      "",
      ""
     ],
     "text": "js sortn.js",
     "saved_object_attributes": {
      "filename": "sortn.js",
      "parameter_enable": 0
     }
    }
   },
   {
    "box": {
     "id": "o6",
     "maxclass": "newobj",
     "numinlets": 1,
     "numoutlets": 0,
     "patching_rect": [
      150,
      130,
      80,
      22
     ],
     "outlettype": [],
     "text": "s ---sorttoweb"
    }
   },
   {
    "box": {
     "id": "d1",
     "maxclass": "newobj",
     "numinlets": 0,
     "numoutlets": 1,
     "patching_rect": [
      500,
      20,
      90,
      22
     ],
     "outlettype": [
      ""
     ],
     "text": "r ---sorttoweb"
    }
   },
   {
    "box": {
     "id": "d2",
     "maxclass": "newobj",
     "numinlets": 1,
     "numoutlets": 1,
     "patching_rect": [
      600,
      20,
      60,
      22
     ],
     "outlettype": [
      "bang"
     ],
     "text": "loadbang"
    }
   },
   {
    "box": {
     "id": "d3",
     "maxclass": "message",
     "numinlets": 2,
     "numoutlets": 1,
     "patching_rect": [
      600,
      50,
      160,
      22
     ],
     "outlettype": [
      ""
     ],
     "text": "read sortn.html"
    }
   },
   {
    "box": {
     "id": "d4",
     "maxclass": "jweb",
     "numinlets": 1,
     "numoutlets": 2,
     "patching_rect": [
      500,
      200,
      340,
      169
     ],
     "outlettype": [
      "",
      ""
     ],
     "presentation": 1,
     "presentation_rect": [
      0,
      0,
      340,
      169
     ],
     "rendermode": 1
    }
   },
   {
    "box": {
     "id": "d5",
     "maxclass": "newobj",
     "numinlets": 1,
     "numoutlets": 0,
     "patching_rect": [
      500,
      400,
      90,
      22
     ],
     "outlettype": [],
     "text": "s ---sortfromweb"
    }
   },
   {
    "box": {
     "id": "r1",
     "maxclass": "newobj",
     "numinlets": 1,
     "numoutlets": 1,
     "patching_rect": [
      300,
      130,
      60,
      22
     ],
     "outlettype": [
      ""
     ],
     "text": "deferlow"
    }
   },
   {
    "box": {
     "id": "r2",
     "maxclass": "newobj",
     "numinlets": 1,
     "numoutlets": 2,
     "patching_rect": [
      300,
      160,
      40,
      22
     ],
     "outlettype": [
      "",
      ""
     ],
     "text": "t b b"
    }
   },
   {
    "box": {
     "id": "r3",
     "maxclass": "message",
     "numinlets": 2,
     "numoutlets": 1,
     "patching_rect": [
      340,
      190,
      55,
      22
     ],
     "outlettype": [
      ""
     ],
     "text": "compile"
    }
   }
  ],
  "lines": [
   {
    "patchline": {
     "source": [
      "o1",
      0
     ],
     "destination": [
      "o2",
      0
     ]
    }
   },
   {
    "patchline": {
     "source": [
      "o1",
      1
     ],
     "destination": [
      "o2",
      1
     ]
    }
   },
   {
    "patchline": {
     "source": [
      "o3",
      0
     ],
     "destination": [
      "o5",
      0
     ]
    }
   },
   {
    "patchline": {
     "source": [
      "o5",
      0
     ],
     "destination": [
      "o6",
      0
     ]
    }
   },
   {
    "patchline": {
     "source": [
      "d1",
      0
     ],
     "destination": [
      "d4",
      0
     ]
    }
   },
   {
    "patchline": {
     "source": [
      "d2",
      0
     ],
     "destination": [
      "d3",
      0
     ]
    }
   },
   {
    "patchline": {
     "source": [
      "d3",
      0
     ],
     "destination": [
      "d4",
      0
     ]
    }
   },
   {
    "patchline": {
     "source": [
      "d4",
      0
     ],
     "destination": [
      "d5",
      0
     ]
    }
   },
   {
    "patchline": {
     "source": [
      "o4",
      0
     ],
     "destination": [
      "o5",
      0
     ]
    }
   },
   {
    "patchline": {
     "source": [
      "o5",
      1
     ],
     "destination": [
      "r1",
      0
     ]
    }
   },
   {
    "patchline": {
     "source": [
      "r1",
      0
     ],
     "destination": [
      "r2",
      0
     ]
    }
   },
   {
    "patchline": {
     "source": [
      "r2",
      1
     ],
     "destination": [
      "r3",
      0
     ]
    }
   },
   {
    "patchline": {
     "source": [
      "r3",
      0
     ],
     "destination": [
      "o5",
      0
     ]
    }
   },
   {
    "patchline": {
     "source": [
      "r2",
      0
     ],
     "destination": [
      "o5",
      0
     ]
    }
   }
  ],
  "devicewidth": 340.0,
  "description": "sortn \u2013 Spuren erkennen, umbenennen, f\u00e4rben",
  "project": {
   "version": 1,
   "creationdate": 3590052786,
   "modificationdate": 3590052786,
   "viewrect": [
    0,
    0,
    300,
    500
   ],
   "autoorganize": 1,
   "hideprojectwindow": 1,
   "showdependencies": 1,
   "autolocalize": 0,
   "contents": {
    "patchers": {}
   },
   "layout": {},
   "searchpath": {},
   "detailsvisible": 0,
   "amxdtype": 1633771873,
   "readonly": 0,
   "devpathtype": 0,
   "devpath": ".",
   "sortmode": 0,
   "viewmode": 0
  }
 }
}