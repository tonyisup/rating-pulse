// --- Tunable Parameters ---
let valueGravity = 0.0015; // How fast the rating decays (higher = faster)
let bumpAmount = .4;    // How much a tap increases the rating
let bubbleVisualGravity = valueGravity; // How fast the visual bubble falls
let bubbleBouncePower = 1.2;   // How much the visual bubble jumps when tapped (increased from 0.4)
let bubbleDamping = 0.92; // How quickly the bubble's velocity decreases (new parameter)
let numColumns = 1; // Changed from 11 to 1 - only one balloon in the middle
let columnSpacing = 0.2; // Spacing between columns as fraction of screen width

// Movie metric labels and colors
const metricLabels = [
  "Rating",
];

// Color palette for each metric
const balloonColors = [
  { fill: [255, 99, 71, 200], knot: [220, 79, 51, 200] },    // Rating - Tomato Red
];

// --- Global State Variables ---
let ratings = []; // Array of ratings for each column
let ratingHistories = []; // Array of rating histories for each column
let paused = false;
let ended = false;
let startTime;
let pausedTime = 0; // Track how much time was spent paused
let lastPauseTime; // Track when we last paused

// Interaction tracking
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let dragStartTime = 0;
let activeBalloonIndex = -1;

// --- Visual Bubble Variables ---
let bubbleYs = []; // Array of Y positions for each balloon
let bubbleDiameter = 60; // Slightly smaller to fit more columns
let bubbleVelocitiesY = []; // Array of Y velocities for each balloon
let deformationAmounts = []; // Array of deformation amounts for each balloon
let deformationDamping = 0.92;

// --- UI Element Definitions ---
let pauseButtonArea = { x: 0, y: 0, w: 0, h: 0 };
let resumeButtonArea;
let endButtonArea;
let restartButtonArea;
let graphDisplayArea;

// --- Setup ---
function setup() {
  createCanvas(windowWidth, windowHeight);
  
  // Initialize arrays for each column
  for (let i = 0; i < numColumns; i++) {
    ratings[i] = 5.0;
    ratingHistories[i] = [ratings[i]];
    bubbleYs[i] = mapRatingToY(ratings[i]);
    bubbleVelocitiesY[i] = 0;
    deformationAmounts[i] = 0;
  }

  calculateLayout();
  textAlign(CENTER, CENTER);
  textSize(16);
  // frameRate(30); // Optional: Can reduce frame rate if needed
  console.log("Setup complete. Tap screen to boost rating.");
  startTime = Date.now();
}

// --- Main Draw Loop ---
function draw() {
  background(40, 45, 50);

  // Draw time at the top
  fill(255);
  textSize(20);
  textAlign(CENTER, TOP);
  let currentTime = paused ? lastPauseTime : Date.now();
  let elapsedTime = Math.floor((currentTime - startTime - pausedTime) / 1000); // Time in seconds
  let minutes = Math.floor(elapsedTime / 60);
  let seconds = elapsedTime % 60;
  text(nf(minutes, 2) + ":" + nf(seconds, 2), width / 2, 20);

  // Draw drag line if dragging
  if (isDragging && activeBalloonIndex >= 0) {
    let x = width / 2; // Center of screen
    stroke(100, 100, 100, 150);
    strokeWeight(2);
    line(x, dragStartY, mouseX, mouseY);
  }

  if (ended) {
    drawEndScreen();
  } else if (paused) {
    drawPauseScreen();
    // Keep drawing the static balloon while paused
    drawBalloon(0);
  } else {
    // --- Running State ---
    // 1. Update the Rating (apply gravity)
    ratings[0] -= valueGravity;
    ratings[0] = max(0, ratings[0]);

    // 2. Update Visual Bubble Physics
    bubbleVelocitiesY[0] += bubbleVisualGravity;
    bubbleYs[0] += bubbleVelocitiesY[0];
    bubbleVelocitiesY[0] *= bubbleDamping;

    // 3. Keep visual bubble within screen bounds
    let topBound = bubbleDiameter / 2 + 10;
    // Make bottom boundary stop above the pause button, accounting for string length
    let stringLength = 40;
    let bottomBound = pauseButtonArea.y - bubbleDiameter / 2 - stringLength - 10;
    if (bubbleYs[0] > bottomBound) {
      bubbleYs[0] = bottomBound;
      bubbleVelocitiesY[0] *= -0.4;
    }
    if (bubbleYs[0] < topBound) {
      bubbleYs[0] = topBound;
      bubbleVelocitiesY[0] = 0;
    }

    // 4. Update the rating based on bubble position
    ratings[0] = mapYToRating(bubbleYs[0]);

    // 5. Store current rating for history
    ratingHistories[0].push(ratings[0]);

    // 6. Draw elements
    drawBalloon(0);
    drawPauseButton();
  }
}

// --- Drawing Functions ---

function drawBalloon(columnIndex) {
  let x = width / 2; // Center of screen
  let y = bubbleYs[columnIndex];
  
  // Draw metric label above the balloon
  fill(255);
  textSize(14);
  textAlign(CENTER, CENTER);
  text(metricLabels[columnIndex], x, y - bubbleDiameter/2 - 20);
  
  // Update deformation animation
  if (deformationAmounts[columnIndex] > 0) {
    deformationAmounts[columnIndex] *= deformationDamping;
  }
  
  // Draw the balloon string
  stroke(100);
  strokeWeight(2);
  let stringLength = 40;
  line(x, y + bubbleDiameter/2, x, y + bubbleDiameter/2 + stringLength);
  
  // Draw the balloon body with deformation
  noStroke();
  fill(balloonColors[columnIndex].fill);
  push();
  translate(x, y);
  let stretchX = 1 + deformationAmounts[columnIndex] * 0.3;
  let stretchY = 1.1 - deformationAmounts[columnIndex] * 0.2;
  scale(stretchX, stretchY);
  ellipse(0, 0, bubbleDiameter, bubbleDiameter);
  pop();
  
  // Draw the balloon knot
  fill(balloonColors[columnIndex].knot);
  ellipse(x, y + bubbleDiameter/2 - 5, 12, 12);
  
  // Draw the balloon string coming from the knot
  stroke(100);
  strokeWeight(2);
  line(x, y + bubbleDiameter/2 - 5, x, y + bubbleDiameter/2 + stringLength);

  // Text inside balloon
  fill(255);
  textSize(18);
  textFont('sans-serif');
  textAlign(CENTER, CENTER);
  text(nf(ratings[columnIndex], 1, 1), x, y - 5);
}

function drawPauseButton() {
  fill(200, 200, 200, 180); // Semi-transparent gray
  stroke(50);
  rect(pauseButtonArea.x, pauseButtonArea.y, pauseButtonArea.w, pauseButtonArea.h, 5); // Rounded corners

  fill(0);
  noStroke();
  textSize(14);
  text("Pause", pauseButtonArea.x + pauseButtonArea.w / 2, pauseButtonArea.y + pauseButtonArea.h / 2);
}

function drawPauseScreen() {
  // Dim background
  fill(0, 0, 0, 150);
  rect(0, 0, width, height);

  // Resume Button
  fill(150, 255, 150, 220); // Greenish
  noStroke();
  rect(resumeButtonArea.x, resumeButtonArea.y, resumeButtonArea.w, resumeButtonArea.h, 8);
  fill(0);
  textSize(18);
  text("Resume", resumeButtonArea.x + resumeButtonArea.w / 2, resumeButtonArea.y + resumeButtonArea.h / 2);

  // End Button
  fill(255, 150, 150, 220); // Reddish
  noStroke();
  rect(endButtonArea.x, endButtonArea.y, endButtonArea.w, endButtonArea.h, 8);
  fill(0);
  textSize(18);
  text("End Session", endButtonArea.x + endButtonArea.w / 2, endButtonArea.y + endButtonArea.h / 2);
}

function drawEndScreen() {
  background(50, 60, 70);

  // Display title
  fill(230);
  textSize(28);
  text("Session Ended", width / 2, 60);

  // Draw the graph
  drawHistoryGraphs();

  // Calculate overall average rating
  let sum = ratingHistories[0].reduce((a, b) => a + b, 0);
  let overallAverage = sum / ratingHistories[0].length;

  // Position the overall average in the center
  let graphHeight = graphDisplayArea.h / 2;
  let graphMargin = 20;
  
  let gx = graphDisplayArea.x;
  let gy = graphDisplayArea.y + graphHeight + graphMargin;
  let gw = graphDisplayArea.w;
  let gh = graphHeight - graphMargin;
  
  // Draw a background for the overall average
  fill(235, 240, 245);
  noStroke();
  rect(gx, gy, gw, gh);
  stroke(100);
  noFill();
  rect(gx, gy, gw, gh);
  
  // Display the overall average
  fill(50);
  noStroke();
  textSize(16);
  textAlign(CENTER, TOP);
  text("OVERALL\nAVERAGE", gx + gw/2, gy + 10);
  
  textSize(36);
  textAlign(CENTER, CENTER);
  text(nf(overallAverage, 1, 2), gx + gw/2, gy + gh/2 + 20);

  // Draw Restart Button
  fill(180, 180, 220, 220);
  noStroke();
  rect(restartButtonArea.x, restartButtonArea.y, restartButtonArea.w, restartButtonArea.h, 8);
  fill(0);
  textSize(18);
  textAlign(CENTER, CENTER);
  text("Restart", restartButtonArea.x + restartButtonArea.w / 2, restartButtonArea.y + restartButtonArea.h / 2);
}

function drawHistoryGraphs() {
  let graphHeight = graphDisplayArea.h / 2;
  let graphMargin = 20;
  
  // Draw only one graph in the center
  let gx = graphDisplayArea.x;
  let gy = graphDisplayArea.y;
  let gw = graphDisplayArea.w;
  let gh = graphHeight - graphMargin;

  push();
  
  // Calculate average for this metric
  let sum = ratingHistories[0].reduce((a, b) => a + b, 0);
  let average = sum / ratingHistories[0].length;
  
  // Draw graph background and border
  fill(235, 240, 245);
  noStroke();
  rect(gx, gy, gw, gh);
  stroke(100);
  noFill();
  rect(gx, gy, gw, gh);

  // Draw metric label and average
  fill(50);
  noStroke();
  textSize(12);
  textAlign(CENTER, TOP);
  text(metricLabels[0], gx + gw/2, gy + 5);
  textSize(14);
  textAlign(CENTER, TOP);
  text("Avg: " + nf(average, 1, 2), gx + gw/2, gy + 25);

  // Draw Y-axis labels (0-10)
  fill(50);
  noStroke();
  textSize(10);
  textAlign(RIGHT, CENTER);
  for (let j = 0; j <= 10; j += 2) {
    let yPos = map(j, 0, 10, gy + gh - 20, gy + 45); // Adjusted to account for label space
    text(j, gx - 5, yPos);
    stroke(200);
    line(gx, yPos, gx + gw, yPos);
  }

  // Draw the rating line graph
  if (ratingHistories[0].length > 1) {
    noFill();
    stroke(balloonColors[0].fill[0], balloonColors[0].fill[1], balloonColors[0].fill[2]);
    strokeWeight(2);
    beginShape();
    for (let j = 0; j < ratingHistories[0].length; j++) {
      let x = map(j, 0, ratingHistories[0].length - 1, gx + 10, gx + gw - 10);
      let val = constrain(ratingHistories[0][j], 0, 10);
      let y = map(val, 0, 10, gy + gh - 20, gy + 45); // Adjusted to account for label space
      vertex(x, y);
    }
    endShape();
  }

  pop();
}

// --- Input Handling ---

function touchStarted() {
  mousePressed();
  return false;
}

function touchMoved() {
  mouseDragged();
  return false;
}

function touchEnded() {
  mouseReleased();
  return false;
}

function mousePressed() {
  if (ended || paused) {
    handleInput(mouseX, mouseY);
    return;
  }

  // Check if clicking the balloon or its string
  let x = width / 2; // Center of screen
  let y = bubbleYs[0];
  
  let boxWidth = bubbleDiameter * 1.2;
  let boxHeight = bubbleDiameter + 40;
  let boxX = x - boxWidth/2;
  let boxY = y - bubbleDiameter/2;
  
  if (mouseX >= boxX && mouseX <= boxX + boxWidth &&
      mouseY >= boxY && mouseY <= boxY + boxHeight) {
    // Apply upward force to mimic a swipe up
    let upwardForce = -bubbleBouncePower * 2; // Negative value for upward movement
    bubbleVelocitiesY[0] = upwardForce;
    deformationAmounts[0] = abs(upwardForce) / bubbleBouncePower;
    
    // Still set up for dragging if needed
    isDragging = true;
    dragStartX = mouseX;
    dragStartY = mouseY;
    dragStartTime = Date.now();
    activeBalloonIndex = 0;
    return;
  }
  
  // If not clicking a balloon, check UI buttons
  handleInput(mouseX, mouseY);
}

function mouseDragged() {
  if (!isDragging || activeBalloonIndex < 0) return;
  
  // Calculate drag distance and direction
  let dragDistance = mouseY - dragStartY;
  let dragDuration = Date.now() - dragStartTime;
  
  // Only apply force if drag is significant
  if (abs(dragDistance) > 10) {
    let force = map(dragDistance, -100, 100, -bubbleBouncePower * 2, bubbleBouncePower * 2);
    force = constrain(force, -bubbleBouncePower * 2, bubbleBouncePower * 2);
    
    bubbleVelocitiesY[activeBalloonIndex] = force;
    deformationAmounts[activeBalloonIndex] = abs(force) / bubbleBouncePower;
  }
}

function mouseReleased() {
  if (!isDragging || activeBalloonIndex < 0) return;
  
  // Calculate final velocity based on drag speed
  let dragDistance = mouseY - dragStartY;
  let dragDuration = Date.now() - dragStartTime;
  let dragSpeed = dragDistance / dragDuration;
  
  // Apply velocity based on drag speed
  let force = map(dragSpeed, -2, 2, -bubbleBouncePower * 2, bubbleBouncePower * 2);
  force = constrain(force, -bubbleBouncePower * 2, bubbleBouncePower * 2);
  
  bubbleVelocitiesY[activeBalloonIndex] = force;
  deformationAmounts[activeBalloonIndex] = abs(force) / bubbleBouncePower;
  
  isDragging = false;
  activeBalloonIndex = -1;
}

function handleInput(mx, my) {
  if (ended) {
    if (isInsideArea(mx, my, restartButtonArea)) {
      restartSession();
    }
  } else if (paused) {
    if (isInsideArea(mx, my, resumeButtonArea)) {
      paused = false;
      pausedTime += Date.now() - lastPauseTime;
      console.log("Resumed");
    } else if (isInsideArea(mx, my, endButtonArea)) {
      ended = true;
      paused = false;
      console.log("Session Ended");
      calculateLayout();
    }
  } else {
    if (isInsideArea(mx, my, pauseButtonArea)) {
      paused = true;
      lastPauseTime = Date.now();
      console.log("Paused");
    }
  }
}

// --- Utility Functions ---

// Maps the 0-10 rating to a Y coordinate for the bubble center
function mapRatingToY(rating) {
  let topPadding = bubbleDiameter / 2 + 30; // Space from top
  // Use pause button position as bottom boundary if available, otherwise use default
  let stringLength = 40;
  let bottomBound = pauseButtonArea && pauseButtonArea.y ? 
    pauseButtonArea.y - bubbleDiameter / 2 - stringLength - 10 : 
    height - bubbleDiameter / 2 - stringLength - 30;
  return map(rating, 0, 10, bottomBound, topPadding);
}

// Maps a Y coordinate to a 0-10 rating (new function)
function mapYToRating(y) {
  let topPadding = bubbleDiameter / 2 + 30; // Space from top
  // Use pause button position as bottom boundary if available, otherwise use default
  let stringLength = 40;
  let bottomBound = pauseButtonArea && pauseButtonArea.y ? 
    pauseButtonArea.y - bubbleDiameter / 2 - stringLength - 10 : 
    height - bubbleDiameter / 2 - stringLength - 30;
  return map(y, bottomBound, topPadding, 0, 10);
}

// Checks if a point (mx, my) is inside a rectangular area {x, y, w, h}
function isInsideArea(mx, my, area) {
  return mx >= area.x && mx <= area.x + area.w &&
         my >= area.y && my <= area.y + area.h;
}

// Resets the state to start a new session
function restartSession() {
  console.log("Restarting session...");
  ratings[0] = 5.0;
  ratingHistories[0] = [ratings[0]];
  bubbleYs[0] = mapRatingToY(ratings[0]);
  bubbleVelocitiesY[0] = 0;
  deformationAmounts[0] = 0;
  startTime = Date.now();
  pausedTime = 0; // Reset paused time
  paused = false;
  ended = false;
  calculateLayout();
}

// Recalculates UI element positions - Call in setup and windowResized
function calculateLayout() {
  let buttonW = 120;
  let buttonH = 50;
  let pauseW = 60;
  let pauseH = 35;
  let margin = 20;

  // Position pause button in lower left
  pauseButtonArea = { 
    x: margin, 
    y: height - pauseH - margin, 
    w: pauseW, 
    h: pauseH 
  };

  // Position resume and end buttons along the bottom of the screen
  resumeButtonArea = { 
    x: width - buttonW * 2 - margin * 2, 
    y: height - buttonH - margin, 
    w: buttonW, 
    h: buttonH 
  };
  
  endButtonArea = { 
    x: width - buttonW - margin, 
    y: height - buttonH - margin, 
    w: buttonW, 
    h: buttonH 
  };

  // Position restart button in lower right
  restartButtonArea = { 
    x: width - buttonW - margin, 
    y: height - buttonH - margin, 
    w: buttonW, 
    h: buttonH 
  };

  // Define graph area relative to screen size and other elements
  let graphMarginX = 50;
  let graphMarginTop = 150;
  let graphMarginBottom = 120; // Increased to accommodate buttons
  graphDisplayArea = {
    x: graphMarginX,
    y: graphMarginTop,
    w: width - 2 * graphMarginX,
    h: height - graphMarginTop - graphMarginBottom
  };
  // Ensure graph height is not negative if screen is very small
  graphDisplayArea.h = max(50, graphDisplayArea.h);
}

// --- Handle Window Resizing ---
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  // Recalculate layout for responsiveness
  calculateLayout();
  // Re-center bubble Y potentially, though gravity/taps will adjust it
  // bubbleY = mapRatingToY(currentRating); // Optional: Reset visual position on resize
  console.log("Window Resized");
}