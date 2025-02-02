/**
 * Created by Tony on 6/15/2014.
 */


/*
 BasicAnimationBehavior

 Note: use with round-robin priority manager
 */
var basicAnimationBehavior = {
    name: "BasicAnimationBehavior",
    think: {
        facts: [
            {
                "name": "speed", "value": { x: 0, y: 0 , z: 0}
            },
            {
                "name": "direction", "value": {x: "L", y: "D", z:"C"}
            },
            {
                "name": "position", "value":  { id: 0, x: 0, y: 0 , z: 0}
            },
            {
                "name": "targetLocation", "value":  { x: 0, y: 0 , z: 0}
            },
            {
                "name": "nearDistance", "value":  10
            }
        ],
        thoughts: [
            {
                "name": "moveToLocation"
            }
        ]
    },
    tasks: {
        moveToLocation: function (taskExecutionArgs) {
            var score = 0;
            var hasMoved = taskExecutionArgs.agent._tasks.attemptMove(taskExecutionArgs);

            taskExecutionArgs.evaluation.quality = score;
            taskExecutionArgs.response.status = 200;
            taskExecutionArgs.response.content = "moveToLocation";
        },
        attemptMove: function (args) {
            var this_agent = args.agent;
            var task = args.task;
            var tasks = this_agent._tasks;
            var score = 0;
            var rc = false;

            var speed = this_agent.recall({ name: "speed" });
            var direction = this_agent.recall({ name: "direction" });
            var position = this_agent.recall({ name: "position" });
            var targetLocation = this_agent.recall({ name: "targetLocation" });

            var x = position.x;
            var y = position.y;
            var z = position.z;

            switch (direction.x) {
                case "L":   // left
                    x -= speed.x;
                    break;
                case "R":   // right
                    x += speed.x;
                    break;
            }

            switch (direction.y) {
                case "U":   // up
                    y -= speed.y;
                    break;
                case "D":   // down
                    y += speed.y;
                    break;
            }

            switch (direction.z) {
                case "C":   // closer
                    z -= speed.z;
                    break;
                case "F":   // further
                    z += speed.z;
                    break;
            }

            var xBounds = this_agent.recall({ name: "xBounds" });
            var yBounds = this_agent.recall({ name: "yBounds" });
            var zBounds = this_agent.recall({ name: "zBounds" });

            // handle boundaries
            var changedDirection = false;
            if (x <= xBounds.min || x >= xBounds.max) {
                if (tasks.onxBounds) {
                    direction.x = tasks.onxBounds(this_agent, tasks, x, xBounds, position, speed.x);
                    changedDirection = true;
                }
            }

            if (y <= yBounds.min || y >= yBounds.max) {
                if (tasks.onyBounds) {
                    direction.y = tasks.onyBounds(this_agent, tasks, y, yBounds, position, speed.y);
                    changedDirection = true;
                }
            }

            if (z <= zBounds.min || z >= zBounds.max) {
                if (tasks.onzBounds) {
                    direction.z = tasks.onzBounds(this_agent, tasks, z, zBounds, position, speed.z);
                    changedDirection = true;
                }
            }

            if (tasks.nearLocation(position,targetLocation)) {
                if (tasks.onNearLocation) {
                    tasks.onNearLocation(this_agent, tasks, position, targetLocation, speed);
                }
            }

            if (!changedDirection) {
                position.x = x;
                position.y = y;
                position.z = z;
            }

            if (tasks.onMove) {
                tasks.onMove(this_agent, position, direction, speed);
            }

            rc = true;

            return rc;
        },
        nearLocation: function(position, targetLocation) {
            if (Math.abs(targetLocation.x - position.x) < 10) {
                return true;
            }
            return false;
        },
        onxBounds: function(this_agent, tasks, proposedPos, xBounds, currentPosition, speed) {
            var direction;

            if (proposedPos <= xBounds.min) {
                currentPosition.x += speed;
                direction = "R";
            }
            else {
                currentPosition.x -= speed;
                direction = "L";
            }

            return direction;
        },
        onyBounds: function(this_agent, tasks, proposedPos, yBounds, currentPosition, speed) {
            var direction;

            if (proposedPos <= yBounds.min) {
                currentPosition.y += speed;
                direction = "D";
            }
            else {
                currentPosition.y -= speed;
                direction = "U";
            }

            return direction;
        },
        onzBounds: function(this_agent, tasks, proposedPos, zBounds, currentPosition, speed) {
            var direction;

            if (proposedPos <= zBounds.min) {
                currentPosition.z += speed;
                direction = "F";
            }
            else {
                currentPosition.z -= speed;
                direction = "C";
            }

            return direction;
        },
        onMove: function(this_agent) {
            var vicinity = this_agent.vicinity;
            if (vicinity && vicinity.onAgentMove) {
                vicinity.onAgentMove(this_agent._name, this_agent);
            }
        }
    }
};
