var myConfig = {
      "type": "chord",
      "options": {
        "radius": "90%"
      },
      "plotarea": {
        "margin": "dynamic"
      },
      "series": [{
        "values": [],
        "text": "A"
      }, {
        "values": [],
        "text": "B"
      }, {
        "values": [],
        "text": "C"
      }, {
        "values": [],
        "text": "D"
      }]
    };

    zingchart.render({
      id: 'myChart',
      data: myConfig,
      height: "100%",
      width: "100%",
      
    });