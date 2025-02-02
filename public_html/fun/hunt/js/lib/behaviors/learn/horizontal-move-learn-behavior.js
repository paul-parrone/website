/**
 * Created by Tony on 6/15/2014.
 */


/*
 algorithm:

 Note: use with most-effective priority manager
 */
var horizontalMoveLearnBehavior = {
    name: "horizontalMoveLearn",
    think: {
        facts: [
            {
                "name": "speed", "value": 1
            },
            {
                "name": "direction", "value": "L"
            },
            {
                "name": "dimensions", "value": null
            },
            {
                "name": "trail", "value": []
            }
        ],
        thoughts: [
            {
                "name": "move", "done": false, "onCondition": "isClearToGo"
            }
        ]
    },
    tasks: {
        attemptMove: function (moveArgs) {
            var task = moveArgs.task;
            var this_agent = moveArgs.agent;
            var thisDirection = moveArgs.direction;
            var check = moveArgs.check;

            var rc = false;

            var this_agent = moveArgs.agent;
            if (!this_agent) {
                this_agent = ths._agent;
            }

            var currentDirection = this_agent.recall({ name: "direction" });
            this_agent.remember({ name: "direction", fact: thisDirection });

            var trail = this_agent.recall({ name: "trail" });
            var lastDirection = trail[trail.length - 1];

            var isClear = this_agent.recall({ name: check });
            if (isClear == true) {
                var dimensions = this_agent.recall({ name: "dimensions" });
                var speed = this_agent.recall({ name: "speed" });
                switch (thisDirection) {
                    case "L":
                        dimensions.x = dimensions.x - speed;
                        break;
                    case "R":
                        dimensions.x = dimensions.x + speed;
                        break;
                    case "U":
                        dimensions.y = dimensions.y - speed;
                        break;
                    case "D":
                        dimensions.y = dimensions.y + speed;
                        break;
                }

                this_agent.remember({ name: "direction", fact: thisDirection });

                if (this_agent.onMove) {
                    var dimensionsArray = [];
                    var pos = { "x": dimensions.x, "y": dimensions.y, "width": dimensions.width, "height": dimensions.height, "image": "main", "name": this_agent._name };
                    dimensionsArray.push({ name: this_agent._name, dimensions: pos });
                    this_agent.onMove(dimensionsArray);
                }

                rc = true;
            }

            //moveArgs.score = score;

            return rc;
        },
        move: function (taskExecutionArgs) {
            var this_agent = taskExecutionArgs.agent;
            var currentDirection = this_agent.recall({ name: "direction" });

            var moveArgs = {
                agent: this_agent,
                task: taskExecutionArgs.task,
                direction: currentDirection,
                check: "isClearToGo", score: 0
            };
            var hasMoved = this_agent._tasks.attemptMove(moveArgs);

            if (hasMoved) {
                //console.log("movedLeft\n");
            }

            taskExecutionArgs.evaluation.quality = moveArgs.score;
            taskExecutionArgs.evaluation.performance = moveArgs.score;
            taskExecutionArgs.response.status = 200;
            taskExecutionArgs.response.content = "move";
        },
        isClear: function (conditionArgs) {
            var ths = conditionArgs.ths;
            var proposedDirection = conditionArgs.proposedDirection;
            var thght = conditionArgs.thought;
            var score = 0;
            var rc = false;

            var this_agent = conditionArgs.agent;
            if (!this_agent) {
                this_agent = ths._agent;
            }

            // based on direction and speed determine if agt will collide with obstacle
            var dimensions = this_agent.recall({ name: "dimensions" });

            var x = dimensions.x;
            var y = dimensions.y;
            var width = dimensions.width;
            var height = dimensions.height;

            var speed = this_agent.recall({ name: "speed" });

            switch (proposedDirection) {
                case "L":
                    x -= speed;
                    break;
                case "R":
                    x += speed;
                    break;
                case "U":
                    y -= speed;
                    break;
                case "D":
                    y += speed;
                    break;
            }

            var xMax = this_agent.recall({ name: "xMax" });
            var yMax = this_agent.recall({ name: "yMax" });

            // handle boundaries
            if ((x <= 0 || x >= xMax) || (y <= 0 || y >= yMax)) {
                score -= 20;
                thght.priority = score;
                return false;
            }

            var item = this_agent.vicinity.grid.getClosestItem(this_agent._name, proposedDirection, x, y, width, height);

            if (item) {
                score -= 3;
                rc = false;
            }
            else {
                score += 3;
                rc = true;
            }

            // if recently went that direction then return false.  check second to last item
            var currentDirection = this_agent.recall({ name: "direction" });
            score = (currentDirection == proposedDirection && !item) ? score += 2 : score -= 1; // Going in direction?

            var lastDirection = currentDirection;

            score = (lastDirection == proposedDirection) ? score -= 1 : score += 1; // Can go in this direction?

            score = (location) ? score -= 1 : score += 1;

            thght.priority = score;
            return rc;
        },
        isClearToGoInDirection: function(conditionArgs) {
            var this_agent = conditionArgs.agent;

            var currentDirection = this_agent.recall({ name: "direction" });
            conditionArgs.proposedDirection = currentDirection;

            var isClear = this.isClear(conditionArgs);
            this_agent.remember({ name: "isClearToGo", fact: isClear });

            if (isClear == false) {
                var directions = {
                    "L": {isClear: false, distance: -1},
                    "R": {isClear: false, distance: -1}
                };

                // check all the directions
                conditionArgs.proposedDirection = 'L';
                directions["L"].isClear = this.isClear(conditionArgs);

                conditionArgs.proposedDirection = 'R';
                directions["R"].isClear = this.isClear(conditionArgs);

                isClear = true;
                var newDirection;
                switch (currentDirection) {
                    case "L":
                        if (directions[currentDirection].isClear) {
                            newDirection = currentDirection;
                        }
                        else if (directions["R"].isClear) {
                            newDirection = "R";
                        }
                        else {
                            isClear = false;
                        }
                        break;
                    case "R":
                        if (directions[currentDirection].isClear) {
                            newDirection = currentDirection;
                        }
                        else if (directions["L"].isClear) {
                            newDirection = "L";
                        }
                        else {
                            isClear = false;
                        }
                        break;
                }

                this_agent.remember({ name: "direction", fact: newDirection });
            }


            return isClear;
        },
        isClearToGo: function(conditionArgs) {
            return conditionArgs.agent._tasks.isClearToGoInDirection(conditionArgs);
        }
    }
};
