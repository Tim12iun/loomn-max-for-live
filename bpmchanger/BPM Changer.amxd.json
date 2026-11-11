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
   900,
   500
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
  "devicewidth": 300.0,
  "locked_bgcolor": [
   0.0784,
   0.0784,
   0.0784,
   1.0
  ],
  "editing_bgcolor": [
   0.0784,
   0.0784,
   0.0784,
   1.0
  ],
  "description": "BPM Changer – Tempo weich ändern, Rampe über Takte",
  "boxes": [
   {
    "box": {
     "id": "bgp",
     "maxclass": "panel",
     "numinlets": 1,
     "numoutlets": 0,
     "outlettype": [],
     "patching_rect": [
      700,
      600,
      100,
      40
     ],
     "background": 1,
     "bgcolor": [
      0.0784,
      0.0784,
      0.0784,
      1.0
     ],
     "bordercolor": [
      0.0784,
      0.0784,
      0.0784,
      1.0
     ],
     "border": 0,
     "ignoreclick": 1,
     "presentation": 1,
     "presentation_rect": [
      0,
      0,
      300,
      169
     ]
    }
   },
   {
    "box": {
     "id": "ui",
     "maxclass": "jsui",
     "numinlets": 1,
     "numoutlets": 8,
     "outlettype": [
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      ""
     ],
     "patching_rect": [
      400,
      300,
      214,
      169
     ],
     "varname": "bpmui",
     "filename": "bpmchanger.js",
     "parameter_enable": 0,
     "presentation": 1,
     "presentation_rect": [
      0,
      0,
      214,
      169
     ]
    }
   },
   {
    "box": {
     "id": "in",
     "maxclass": "newobj",
     "numinlets": 2,
     "numoutlets": 2,
     "outlettype": [
      "signal",
      "signal"
     ],
     "patching_rect": [
      20,
      20,
      60,
      22
     ],
     "text": "plugin~"
    }
   },
   {
    "box": {
     "id": "out",
     "maxclass": "newobj",
     "numinlets": 2,
     "numoutlets": 0,
     "outlettype": [],
     "patching_rect": [
      20,
      60,
      60,
      22
     ],
     "text": "plugout~"
    }
   },
   {
    "box": {
     "id": "dev",
     "maxclass": "newobj",
     "numinlets": 1,
     "numoutlets": 3,
     "outlettype": [
      "bang",
      "int",
      "int"
     ],
     "patching_rect": [
      120,
      20,
      100,
      22
     ],
     "text": "live.thisdevice"
    }
   },
   {
    "box": {
     "id": "tb",
     "maxclass": "newobj",
     "numinlets": 1,
     "numoutlets": 4,
     "outlettype": [
      "bang",
      "bang",
      "bang",
      "bang"
     ],
     "patching_rect": [
      120,
      50,
      80,
      22
     ],
     "text": "t b b b b"
    }
   },
   {
    "box": {
     "id": "comp0",
     "maxclass": "message",
     "numinlets": 2,
     "numoutlets": 1,
     "outlettype": [
      ""
     ],
     "patching_rect": [
      200,
      80,
      55,
      22
     ],
     "text": "compile"
    }
   },
   {
    "box": {
     "id": "dial",
     "maxclass": "live.dial",
     "numinlets": 1,
     "numoutlets": 2,
     "outlettype": [
      "",
      "float"
     ],
     "patching_rect": [
      20,
      120,
      60,
      72
     ],
     "parameter_enable": 1,
     "presentation_rect": [
      220,
      4,
      76,
      112
     ],
     "varname": "Tempo",
     "activedialcolor": [
      1.0,
      0.3529,
      0.1216,
      1.0
     ],
     "dialcolor": [
      0.1961,
      0.1922,
      0.1843,
      1.0
     ],
     "needlecolor": [
      0.9412,
      0.9333,
      0.9137,
      1.0
     ],
     "activeneedlecolor": [
      0.9412,
      0.9333,
      0.9137,
      1.0
     ],
     "textcolor": [
      0.9412,
      0.9333,
      0.9137,
      1.0
     ],
     "focusbordercolor": [
      1.0,
      0.3529,
      0.1216,
      1.0
     ],
     "hint": "Tempo: drehen gleitet weich, nach dem Loslassen auf ganze BPM.",
     "annotation": "Tempo: weich drehen. Nach dem Loslassen rundet BPM Changer auf ganze BPM. Cmd+M und hier klicken, um einen Controller-Knopf zuzuweisen.",
     "saved_attribute_attributes": {
      "valueof": {
       "parameter_longname": "Tempo",
       "parameter_shortname": "Tempo",
       "parameter_type": 0,
       "parameter_mmin": 60.0,
       "parameter_mmax": 200.0,
       "parameter_initial_enable": 1,
       "parameter_initial": [
        128.0
       ],
       "parameter_unitstyle": 1
      }
     },
     "presentation": 1
    }
   },
   {
    "box": {
     "id": "pdial",
     "maxclass": "newobj",
     "numinlets": 1,
     "numoutlets": 1,
     "outlettype": [
      ""
     ],
     "patching_rect": [
      20,
      200,
      80,
      22
     ],
     "text": "prepend dial"
    }
   },
   {
    "box": {
     "id": "bars",
     "maxclass": "live.numbox",
     "numinlets": 1,
     "numoutlets": 2,
     "outlettype": [
      "",
      "float"
     ],
     "patching_rect": [
      120,
      120,
      76,
      20
     ],
     "parameter_enable": 1,
     "varname": "Takte",
     "hint": "Takte: so lange dauert die Rampe. Ziehen oder Zahl tippen.",
     "annotation": "Takte: über so viele Takte gleitet das Tempo zum Ziel.",
     "saved_attribute_attributes": {
      "valueof": {
       "parameter_longname": "Takte",
       "parameter_shortname": "Takte",
       "parameter_type": 1,
       "parameter_mmin": 1,
       "parameter_mmax": 64,
       "parameter_initial_enable": 1,
       "parameter_initial": [
        16
       ],
       "parameter_unitstyle": 9,
       "parameter_units": "%d Takte"
      }
     },
     "activebgcolor": [
      0.1647,
      0.1608,
      0.1569,
      1.0
     ],
     "bordercolor": [
      0.1647,
      0.1608,
      0.1569,
      1.0
     ],
     "focusbordercolor": [
      1.0,
      0.3529,
      0.1216,
      1.0
     ],
     "textcolor": [
      0.9412,
      0.9333,
      0.9137,
      1.0
     ],
     "tricolor": [
      0.5608,
      0.549,
      0.5255,
      1.0
     ],
     "trioncolor": [
      1.0,
      0.3529,
      0.1216,
      1.0
     ],
     "activeslidercolor": [
      1.0,
      0.3529,
      0.1216,
      1.0
     ]
    }
   },
   {
    "box": {
     "id": "pbars",
     "maxclass": "newobj",
     "numinlets": 1,
     "numoutlets": 1,
     "outlettype": [
      ""
     ],
     "patching_rect": [
      120,
      200,
      80,
      22
     ],
     "text": "prepend bars"
    }
   },
   {
    "box": {
     "id": "ziel",
     "maxclass": "live.numbox",
     "numinlets": 1,
     "numoutlets": 2,
     "outlettype": [
      "",
      "float"
     ],
     "patching_rect": [
      220,
      120,
      76,
      20
     ],
     "parameter_enable": 1,
     "varname": "Ziel",
     "hint": "Ziel-BPM der Rampe. Ziehen oder Zahl tippen.",
     "annotation": "Ziel: auf dieses Tempo gleitet die Rampe.",
     "saved_attribute_attributes": {
      "valueof": {
       "parameter_longname": "Ziel",
       "parameter_shortname": "Ziel",
       "parameter_type": 1,
       "parameter_mmin": 60,
       "parameter_mmax": 200,
       "parameter_initial_enable": 1,
       "parameter_initial": [
        128
       ],
       "parameter_unitstyle": 9,
       "parameter_units": "%d BPM"
      }
     },
     "activebgcolor": [
      0.1647,
      0.1608,
      0.1569,
      1.0
     ],
     "bordercolor": [
      0.1647,
      0.1608,
      0.1569,
      1.0
     ],
     "focusbordercolor": [
      1.0,
      0.3529,
      0.1216,
      1.0
     ],
     "textcolor": [
      0.9412,
      0.9333,
      0.9137,
      1.0
     ],
     "tricolor": [
      0.5608,
      0.549,
      0.5255,
      1.0
     ],
     "trioncolor": [
      1.0,
      0.3529,
      0.1216,
      1.0
     ],
     "activeslidercolor": [
      1.0,
      0.3529,
      0.1216,
      1.0
     ]
    }
   },
   {
    "box": {
     "id": "pziel",
     "maxclass": "newobj",
     "numinlets": 1,
     "numoutlets": 1,
     "outlettype": [
      ""
     ],
     "patching_rect": [
      220,
      200,
      90,
      22
     ],
     "text": "prepend target"
    }
   },
   {
    "box": {
     "id": "start",
     "maxclass": "live.text",
     "numinlets": 1,
     "numoutlets": 2,
     "outlettype": [
      "",
      ""
     ],
     "patching_rect": [
      320,
      120,
      76,
      30
     ],
     "parameter_enable": 1,
     "mode": 1,
     "text": "Start",
     "texton": "Stopp",
     "fontsize": 14.0,
     "fontface": 1,
     "rounded": 7.0,
     "presentation_rect": [
      220,
      126,
      76,
      36
     ],
     "varname": "Start",
     "bgcolor": [
      0.9255,
      0.4,
      0.2118,
      1.0
     ],
     "activebgcolor": [
      0.9255,
      0.4,
      0.2118,
      1.0
     ],
     "bgoncolor": [
      0.1647,
      0.1608,
      0.1569,
      1.0
     ],
     "activebgoncolor": [
      0.1647,
      0.1608,
      0.1569,
      1.0
     ],
     "textcolor": [
      0.9412,
      0.9333,
      0.9137,
      1.0
     ],
     "activetextcolor": [
      0.9412,
      0.9333,
      0.9137,
      1.0
     ],
     "textoncolor": [
      1.0,
      0.3529,
      0.1216,
      1.0
     ],
     "activetextoncolor": [
      1.0,
      0.3529,
      0.1216,
      1.0
     ],
     "bordercolor": [
      0.9255,
      0.4,
      0.2118,
      1.0
     ],
     "focusbordercolor": [
      1.0,
      0.3529,
      0.1216,
      1.0
     ],
     "hint": "Start: Rampe beginnt auf der nächsten 1. Nochmal = abbrechen.",
     "annotation": "Start: die Rampe beginnt auf der nächsten 1 und gleitet über die eingestellten Takte zum Ziel. Nochmal drücken bricht ab.",
     "saved_attribute_attributes": {
      "valueof": {
       "parameter_longname": "Start",
       "parameter_shortname": "Start",
       "parameter_type": 2,
       "parameter_mmax": 1,
       "parameter_enum": [
        "aus",
        "an"
       ],
       "parameter_initial_enable": 1,
       "parameter_initial": [
        0
       ]
      }
     },
     "presentation": 1
    }
   },
   {
    "box": {
     "id": "pstart",
     "maxclass": "newobj",
     "numinlets": 1,
     "numoutlets": 1,
     "outlettype": [
      ""
     ],
     "patching_rect": [
      320,
      200,
      90,
      22
     ],
     "text": "prepend start"
    }
   },
   {
    "box": {
     "id": "lb",
     "maxclass": "newobj",
     "numinlets": 1,
     "numoutlets": 1,
     "outlettype": [
      "bang"
     ],
     "patching_rect": [
      500,
      20,
      60,
      22
     ],
     "text": "loadbang"
    }
   },
   {
    "box": {
     "id": "one",
     "maxclass": "message",
     "numinlets": 2,
     "numoutlets": 1,
     "outlettype": [
      ""
     ],
     "patching_rect": [
      500,
      50,
      30,
      22
     ],
     "text": "1"
    }
   },
   {
    "box": {
     "id": "met",
     "maxclass": "newobj",
     "numinlets": 2,
     "numoutlets": 1,
     "outlettype": [
      "bang"
     ],
     "patching_rect": [
      500,
      80,
      140,
      22
     ],
     "text": "metro 4n @quantize 4n"
    }
   },
   {
    "box": {
     "id": "tick",
     "maxclass": "message",
     "numinlets": 2,
     "numoutlets": 1,
     "outlettype": [
      ""
     ],
     "patching_rect": [
      500,
      110,
      40,
      22
     ],
     "text": "tick"
    }
   },
   {
    "box": {
     "id": "dl",
     "maxclass": "newobj",
     "numinlets": 1,
     "numoutlets": 1,
     "outlettype": [
      ""
     ],
     "patching_rect": [
      720,
      300,
      60,
      22
     ],
     "text": "deferlow"
    }
   },
   {
    "box": {
     "id": "sst",
     "maxclass": "newobj",
     "numinlets": 1,
     "numoutlets": 0,
     "outlettype": [],
     "patching_rect": [
      420,
      500,
      100,
      22
     ],
     "text": "s ---bpmstate"
    }
   },
   {
    "box": {
     "id": "rcmd",
     "maxclass": "newobj",
     "numinlets": 0,
     "numoutlets": 1,
     "outlettype": [
      ""
     ],
     "patching_rect": [
      420,
      260,
      90,
      22
     ],
     "text": "r ---bpmcmd"
    }
   },
   {
    "box": {
     "id": "pc",
     "maxclass": "newobj",
     "numinlets": 1,
     "numoutlets": 1,
     "outlettype": [
      ""
     ],
     "patching_rect": [
      560,
      530,
      60,
      22
     ],
     "text": "pcontrol"
    }
   },
   {
    "box": {
     "id": "win",
     "maxclass": "newobj",
     "text": "p window",
     "varname": "window",
     "numinlets": 1,
     "numoutlets": 0,
     "outlettype": [],
     "patching_rect": [
      560,
      570,
      70,
      22
     ],
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
       200,
       200,
       450,
       254
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
      "toolbarvisible": 0,
      "boxes": [
       {
        "box": {
         "id": "w1",
         "maxclass": "inlet",
         "numinlets": 0,
         "numoutlets": 1,
         "outlettype": [
          ""
         ],
         "patching_rect": [
          10,
          10,
          30,
          30
         ]
        }
       },
       {
        "box": {
         "id": "w2",
         "maxclass": "newobj",
         "text": "r ---bpmstate",
         "numinlets": 0,
         "numoutlets": 1,
         "outlettype": [
          ""
         ],
         "patching_rect": [
          10,
          60,
          90,
          22
         ]
        }
       },
       {
        "box": {
         "id": "w3",
         "maxclass": "jsui",
         "filename": "bpmchanger.js",
         "jsarguments": [
          "win"
         ],
         "parameter_enable": 0,
         "numinlets": 1,
         "numoutlets": 8,
         "outlettype": [
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          ""
         ],
         "patching_rect": [
          10,
          100,
          450,
          254
         ],
         "presentation": 1,
         "presentation_rect": [
          0,
          0,
          450,
          254
         ]
        }
       },
       {
        "box": {
         "id": "w4",
         "maxclass": "newobj",
         "text": "s ---bpmcmd",
         "numinlets": 1,
         "numoutlets": 0,
         "outlettype": [],
         "patching_rect": [
          10,
          400,
          90,
          22
         ]
        }
       },
       {
        "box": {
         "id": "w5",
         "maxclass": "newobj",
         "text": "loadbang",
         "numinlets": 1,
         "numoutlets": 1,
         "outlettype": [
          "bang"
         ],
         "patching_rect": [
          500,
          10,
          60,
          22
         ]
        }
       },
       {
        "box": {
         "id": "w6",
         "maxclass": "message",
         "numinlets": 2,
         "numoutlets": 1,
         "outlettype": [
          ""
         ],
         "patching_rect": [
          500,
          40,
          420,
          22
         ],
         "text": "window flags float, window flags nogrow, window flags nozoom, window size 200 200 650 454, window exec, title BPM Changer"
        }
       },
       {
        "box": {
         "id": "w7",
         "maxclass": "newobj",
         "text": "thispatcher",
         "numinlets": 1,
         "numoutlets": 2,
         "outlettype": [
          "",
          ""
         ],
         "patching_rect": [
          500,
          80,
          80,
          22
         ]
        }
       },
       {
        "box": {
         "id": "w9",
         "maxclass": "message",
         "numinlets": 2,
         "numoutlets": 1,
         "outlettype": [
          ""
         ],
         "patching_rect": [
          600,
          10,
          55,
          22
         ],
         "text": "compile"
        }
       },
       {
        "box": {
         "id": "w8",
         "maxclass": "message",
         "numinlets": 2,
         "numoutlets": 1,
         "outlettype": [
          ""
         ],
         "patching_rect": [
          120,
          10,
          60,
          22
         ],
         "text": "wopen"
        }
       }
      ],
      "lines": [
       {
        "patchline": {
         "source": [
          "w2",
          0
         ],
         "destination": [
          "w3",
          0
         ]
        }
       },
       {
        "patchline": {
         "source": [
          "w3",
          0
         ],
         "destination": [
          "w4",
          0
         ]
        }
       },
       {
        "patchline": {
         "source": [
          "w5",
          0
         ],
         "destination": [
          "w6",
          0
         ]
        }
       },
       {
        "patchline": {
         "source": [
          "w6",
          0
         ],
         "destination": [
          "w7",
          0
         ]
        }
       },
       {
        "patchline": {
         "source": [
          "w1",
          0
         ],
         "destination": [
          "w8",
          0
         ]
        }
       },
       {
        "patchline": {
         "source": [
          "w8",
          0
         ],
         "destination": [
          "w4",
          0
         ]
        }
       },
       {
        "patchline": {
         "source": [
          "w5",
          0
         ],
         "destination": [
          "w9",
          0
         ]
        }
       },
       {
        "patchline": {
         "source": [
          "w9",
          0
         ],
         "destination": [
          "w3",
          0
         ]
        }
       }
      ]
     }
    }
   },
   {
    "box": {
     "id": "node",
     "maxclass": "newobj",
     "numinlets": 1,
     "numoutlets": 2,
     "outlettype": [
      "",
      ""
     ],
     "patching_rect": [
      40,
      620,
      300,
      22
     ],
     "text": "node.script bpmchanger_clean.js @autostart 0 @watch 0"
    }
   }
  ],
  "lines": [
   {
    "patchline": {
     "source": [
      "in",
      0
     ],
     "destination": [
      "out",
      0
     ]
    }
   },
   {
    "patchline": {
     "source": [
      "in",
      1
     ],
     "destination": [
      "out",
      1
     ]
    }
   },
   {
    "patchline": {
     "source": [
      "dev",
      0
     ],
     "destination": [
      "tb",
      0
     ]
    }
   },
   {
    "patchline": {
     "source": [
      "tb",
      3
     ],
     "destination": [
      "comp0",
      0
     ]
    }
   },
   {
    "patchline": {
     "source": [
      "comp0",
      0
     ],
     "destination": [
      "ui",
      0
     ]
    }
   },
   {
    "patchline": {
     "source": [
      "dial",
      0
     ],
     "destination": [
      "pdial",
      0
     ]
    }
   },
   {
    "patchline": {
     "source": [
      "pdial",
      0
     ],
     "destination": [
      "ui",
      0
     ]
    }
   },
   {
    "patchline": {
     "source": [
      "ui",
      0
     ],
     "destination": [
      "dial",
      0
     ]
    }
   },
   {
    "patchline": {
     "source": [
      "bars",
      0
     ],
     "destination": [
      "pbars",
      0
     ]
    }
   },
   {
    "patchline": {
     "source": [
      "pbars",
      0
     ],
     "destination": [
      "ui",
      0
     ]
    }
   },
   {
    "patchline": {
     "source": [
      "ui",
      3
     ],
     "destination": [
      "bars",
      0
     ]
    }
   },
   {
    "patchline": {
     "source": [
      "ziel",
      0
     ],
     "destination": [
      "pziel",
      0
     ]
    }
   },
   {
    "patchline": {
     "source": [
      "pziel",
      0
     ],
     "destination": [
      "ui",
      0
     ]
    }
   },
   {
    "patchline": {
     "source": [
      "ui",
      4
     ],
     "destination": [
      "ziel",
      0
     ]
    }
   },
   {
    "patchline": {
     "source": [
      "start",
      0
     ],
     "destination": [
      "pstart",
      0
     ]
    }
   },
   {
    "patchline": {
     "source": [
      "pstart",
      0
     ],
     "destination": [
      "ui",
      0
     ]
    }
   },
   {
    "patchline": {
     "source": [
      "ui",
      1
     ],
     "destination": [
      "start",
      0
     ]
    }
   },
   {
    "patchline": {
     "source": [
      "tb",
      2
     ],
     "destination": [
      "bars",
      0
     ]
    }
   },
   {
    "patchline": {
     "source": [
      "tb",
      1
     ],
     "destination": [
      "ziel",
      0
     ]
    }
   },
   {
    "patchline": {
     "source": [
      "tb",
      0
     ],
     "destination": [
      "ui",
      0
     ]
    }
   },
   {
    "patchline": {
     "source": [
      "lb",
      0
     ],
     "destination": [
      "one",
      0
     ]
    }
   },
   {
    "patchline": {
     "source": [
      "one",
      0
     ],
     "destination": [
      "met",
      0
     ]
    }
   },
   {
    "patchline": {
     "source": [
      "met",
      0
     ],
     "destination": [
      "tick",
      0
     ]
    }
   },
   {
    "patchline": {
     "source": [
      "tick",
      0
     ],
     "destination": [
      "ui",
      0
     ]
    }
   },
   {
    "patchline": {
     "source": [
      "ui",
      2
     ],
     "destination": [
      "dl",
      0
     ]
    }
   },
   {
    "patchline": {
     "source": [
      "dl",
      0
     ],
     "destination": [
      "tb",
      0
     ]
    }
   },
   {
    "patchline": {
     "source": [
      "ui",
      5
     ],
     "destination": [
      "sst",
      0
     ]
    }
   },
   {
    "patchline": {
     "source": [
      "rcmd",
      0
     ],
     "destination": [
      "ui",
      0
     ]
    }
   },
   {
    "patchline": {
     "source": [
      "ui",
      6
     ],
     "destination": [
      "pc",
      0
     ]
    }
   },
   {
    "patchline": {
     "source": [
      "pc",
      0
     ],
     "destination": [
      "win",
      0
     ]
    }
   },
   {
    "patchline": {
     "source": [
      "ui",
      7
     ],
     "destination": [
      "node",
      0
     ]
    }
   },
   {
    "patchline": {
     "source": [
      "node",
      0
     ],
     "destination": [
      "ui",
      0
     ]
    }
   }
  ],
  "parameters": {
   "dial": [
    "Tempo",
    "Tempo",
    0
   ],
   "bars": [
    "Takte",
    "Takte",
    0
   ],
   "ziel": [
    "Ziel",
    "Ziel",
    0
   ],
   "start": [
    "Start",
    "Start",
    0
   ],
   "parameterbanks": {},
   "inherited_shortname": 1
  },
  "dependency_cache": [],
  "autosave": 0
 }
}