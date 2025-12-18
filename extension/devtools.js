chrome.devtools.panels.create(
  "EventStream Pro",
  null, // Icon path
  "panel/index.html", // Panel UI page (built)
  function (panel) {
    console.log("Panel created successfully");
  }
);
