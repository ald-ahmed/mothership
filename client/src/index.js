import * as serviceWorkerRegistration from "./serviceWorkerRegistration";
import {CameraControls, ConfigForm} from "./controlComponents.js";
import { Canvas, useFrame, useThree } from "react-three-fiber";
import {unboxAPIConfigObject, get3DPosition} from "./utils.js";
import { toast, ToastContainer } from "react-toastify";
import useEventListener from "@use-it/event-listener";
import React, { Component, useState } from "react";
import { Provider, useCannon } from "./useCannon";
import LoadingScreen from "react-loading-screen";
import { isBrowser } from "react-device-detect";
import "react-toastify/dist/ReactToastify.css";
import { useDrag } from "react-use-gesture";
import { Html } from "@react-three/drei";
let humanNames = require("human-names");
import io from "socket.io-client";
import ReactDOM from "react-dom";
import * as CANNON from "cannon";
import * as THREE from "three";
import urls from "./urls.js";
import axios from "axios";
import "./index.css";

// establish a socket connection
const socket = io(`${urls.socketURL}`);

// for distinguishing mouse clicks from mouse drags
let initX, initY;

// the robot 3D component (visualized as a ball)
function Robot(props) {

    const { camera, mouse } = useThree();
    const [position, setPosition] = useState(props.identity.position);
    const [hovered, setHover] = useState(false);
    const [quaternion, setQuaternion] = useState([0, 0, 0, 0]);

    // use cannon js so it can be used in the physics engine
    const { ref, body } = useCannon(
        { bodyProps: { mass: 5 } },
        (body) => {
            body.addShape(new CANNON.Box(new CANNON.Vec3(1, 1, 1)));
            body.position.set(...[position.x, position.y, position.z]);
        },
        []
    );

    // detect clicks and drags of the robot
    const bind = useDrag(
        ({ event, offset: [,], xy: [x, y], first, last }) => {

            // get the 3d world coordinate of the 2d mouse click
            const pos = get3DPosition({
                screenX: mouse.x,
                screenY: mouse.y,
                camera,
            });

            // check if the robot has been dragged sufficiently (more than 0.05 in x and y)
            const positionHasChanged =
                Math.abs(pos.x - initX) > 0.05 && Math.abs(pos.y - initY) > 0.05;

            // if this is the first click (onMouseDown)
            // then set mass to 0 so we can lift the robot up (z direction)
            if (first) {
                body.mass = 0;
                body.updateMassProperties();
                initX = pos.x;
                initY = pos.y;
            }
            // if this is the last click (onMouseUp)
            // then set mass to 5 so the robot can fall
            else if (last) {
                body.mass = 5;
                body.updateMassProperties();

                // if this was a drag, log a position change
                if (positionHasChanged) {
                    props.logPositionChange(props.identity.id, body.position);
                }
                // otherwise set the robot as selected
                else {
                    props.logSelection(props.identity);
                }
            }
            // if this robot was selected and has been sufficiently dragged, move it
            if (!first && positionHasChanged && props.active) {
                body.position.set(pos.x, pos.y, -0.7);
            }
        },
        { pointerEvents: true }
    );

    useFrame(() => {
        // sync cannon body position with three js (keep the physics engine state updated)
        const deltaX = Math.abs(body.position.x - position.x);
        const deltaY = Math.abs(body.position.y - position.y);
        const deltaZ = Math.abs(body.position.z - position.z);

        // if the updates happen too frequently it'll stress the processor
        if (deltaX > 0.001 || deltaY > 0.001 || deltaZ > 0.001) {
            setPosition(body.position.clone());
        }
        const bodyQuaternion = body.quaternion.toArray();
        const quaternionDelta = bodyQuaternion
            .map((n, idx) => Math.abs(n - quaternion[idx]))
            .reduce((acc, curr) => acc + curr);
        if (quaternionDelta > 0.01) {
            setQuaternion(body.quaternion.toArray());
        }
    });

    // return the robot component
    return (
        <mesh
            onPointerOver={() => setHover(true)}
            onPointerOut={() => setHover(false)}
            ref={ref}
            castShadow={true}
            receiveShadow={false}
            position={[position.x, position.y, position.z]}
            quaternion={quaternion}
            {...bind()}
            onClick={(e) => {e.stopPropagation();}}
        >
            <dodecahedronBufferGeometry attach="geometry" />
            <meshLambertMaterial
                attach="material"
                color={hovered ? "rgb(61,96,221)" : props.identity.color}
            />

            <Html scaleFactor={50}>
                <div className="content">
                    {props.active && <status-indicator active pulse />}
                    {props.identity.humanName}
                </div>
            </Html>
        </mesh>
    );
}

// the plane 3D component which everything sits on
function Plane(props) {

    // assign a mass of 0 to indicate a fixed object
    const { ref } = useCannon({ bodyProps: { mass: 0 } }, (body) => {
        body.addShape(new CANNON.Plane());
        body.position.set(...props.position);
    });

    // return the plane component. If clicked, call onPlaneClick (see Index component)
    return (
        <mesh
            ref={ref}
            receiveShadow
            position={props.position}
            onClick={props.onPlaneClick}
        >
            <planeBufferGeometry attach="geometry" args={[100, 100]} />
            <meshPhongMaterial attach="material" color="#087E8B" />
        </mesh>
    );
}

// the index component encapsulating lights, plane, and robots
function Index(props) {
    const { mouse, camera } = useThree();

    // get the 3d world coordinate of the 2d mouse click
    const onPlaneClick = () => {
        const position = get3DPosition({
            screenX: mouse.x,
            screenY: mouse.y,
            camera,
        });

        // send the click event to your parent to handle it
        props.handlePlaneClick(position);
    };

    // helper that zooms in and out when mouse is scrolled
    const mouseWheelScrolled = (e) => {
        let delta = e.wheelDelta;
        delta = delta / 240;
        delta = -delta;
        if (delta <= 0) {
            delta -= camera.position.z * 0.1;
        } else {
            delta += camera.position.z * 0.1;
        }
        if (camera.position.z + delta > 1 && camera.position.z + delta < 200) {
            camera.translateZ(delta);
        }
    };

    // wait for the mouse scroll and call mouseWheelScrolled when it occurs
    useEventListener("wheel", mouseWheelScrolled);

    // add lights, robots, and plane then return the component
    // note that the prop objects is the array of robots passed from the parent
    return (
        <React.Fragment>
            <Provider>
                <ambientLight intensity={0.75} />
                <spotLight
                    castShadow={true}
                    intensity={0.8}
                    position={[0, -50, 200]}
                    angle={Math.PI / 15}
                    penumbra={1}
                />

                {props.objects.map((t) => (
                    <Robot
                        key={t.id}
                        identity={t}
                        active={t.id === props.selectedObjectID}
                        logPositionChange={props.logPositionChange}
                        logSelection={props.logSelection}
                    />
                ))}

                <Plane position={[0, 0, -5]} onPlaneClick={onPlaneClick} />
            </Provider>
        </React.Fragment>
    );
}

// entry point of the react app
// handles all the communication from/to server
class App extends Component {

    constructor(props) {
        super(props);

        this.state = {
            objects: [], // list of object configs to be turned into Robot components in Index
            selectedObjectID: "", // id of the object currently selected
            humanName: "", // human name of the selected object
            color: "", // color of the selected object
            rating: 0, // rating or speed of the selected object
            clickToAdd: true, // use clicks on plane creates a new object
            loading: true, // loading screen is showing
        };
    }

    // once mounted, the component should connect to server socket
    componentDidMount = async () => {

        // once connected, fetch all the objects and display them on screen
        socket.on("connect", () => {

            console.log("got connection to socket");
            this.fetchObjects();

            // if disconnected for whatever reason, show loading screen
            // note once socket reconnects, fetchObjects call above will hide loading screen
            socket.on("disconnect", () => {
                console.log("lost connection to socket");
                this.setState({ loading: true });
            });

        });

        // once you get a new robot from server, unpack it and insert it into our state
        socket.on("newRobot", (realtimeUpdate) => {
            console.log("got new robot from server", realtimeUpdate);

            const objData = realtimeUpdate.document;

            // unbox server object into a robot object
            const newRobot = unboxAPIConfigObject(objData);

            // add this robot object to list of objects
            this.setState((state) => ({
                objects: [...state.objects, newRobot],
            }));

            // show a notification that new robot has been created
            toast.dark("Created " + newRobot.humanName);

        });

        // once you get a robot was deleted server, remove it from our state
        socket.on("deletedRobot", (realtimeUpdate) => {

            // deleting an object from state requires
            // copying current state
            let objects = [...this.state.objects];
            let index = -1;

            // find the index of the deleted object using id in our state
            objects.find((o, i) => {
                if (o.id === realtimeUpdate.id) {
                    index = i;
                    return true; // stop searching
                }
            });

            // object was never in our state, stop here
            if (index === -1){return}

            // get the object that is to be deleted from our state
            const objectToBeDeleted = objects.splice(index, 1)[0];

            // establish a new state without that object
            this.setState({ objects: objects }, function () {
                // in case the object deleted was selected, deselect it
                if (objectToBeDeleted.id === this.state.selectedObjectID) {
                    this.setState({
                        selectedObjectID: "",
                        humanName: "",
                        color: "",
                        rating: 0,
                    });
                }

                // show a notification that a robot has been deleted
                toast.error("Deleted " + objectToBeDeleted.humanName);
            });
        });

        socket.on("modifiedRobot", (realtimeUpdate) => {

            // modifying an object from state requires
            // copying current state
            let objects = [...this.state.objects];
            let index = -1;

            // find the index of the modified object using id in our state
            objects.find((o, i) => {
                if (o.id === realtimeUpdate.id) {
                    let item = { ...objects[i] };
                    // update the objects information
                    item = { ...item, ...realtimeUpdate.updatedFields };
                    objects[i] = item;
                    index = i;
                    return true; // stop searching
                }
            });

            // object was never in our state, stop here
            if (index === -1){return}

            // like delete, modifying an object alone won't trigger a new render
            // we have to delete it from array and then insert it to the end
            const objectModified = objects.splice(index, 1)[0];

            // establish a new state with that modified object
            this.setState({ objects: objects }, function () {
                // in case the object modified was selected, select it again
                if (objectModified.id === this.state.selectedObjectID) {
                    this.setState(
                        {
                            objects: [...objects, objectModified],
                            selectedObjectID: objectModified.id,
                            humanName: objectModified.humanName,
                            color: objectModified.color,
                            rating: objectModified.rating,
                        },
                        function () {
                            // call back after state change, show notification
                            toast.warn("Modified " + objectModified.humanName);
                        }
                    );
                } else {
                    this.setState({ objects: [...objects, objectModified] }, function () {
                        // call back after state change, show notification
                        toast.warn("Modified " + objectModified.humanName);
                    });
                }
            });
        });
    };


    // triggers a get api call to get all robot configs from server
    async fetchObjects() {
        // console.log("Fetching objects");
        try {
            const response = await axios.get(`${urls.baseURL}`);

            if (response.status === 200) {

                // unbox each received object config into a robot object (see utils.js)
                let objects = response.data.map((t) => unboxAPIConfigObject(t));
                objects = objects.filter(function (el) {return el.id != null;});

                // erase all the objects and set the loading to off in case it was loading
                this.setState({
                    objects: objects,
                    loading: false,
                });

            } else {
                console.log("Error fetching objects, got response "+response.status);
            }
        } catch (error) {
            console.log("Error with fetching: ", error);
        }
    }

    // trigger a new state change if an object gets selected
    // called by child component Index
    logSelection = (identity) => {
        // console.log(identity.id, "now selected");
        this.setState({
            selectedObjectID: identity.id,
            humanName: identity.humanName,
            color: identity.color,
            rating: identity.rating,
        });
    };

    // tell the server an object position has been modified
    // an actual state update is made when the socket receives
    // modified robot message
    logPositionChange = async (key, position) => {
        console.log(key, "changed", position);
        if (!key || !position) {
            return;
        }
        try {
            await axios.put(`${urls.baseURL}\\${key}`, {
                position: position,
            });
        } catch (error) {
            console.log("Error with changing location: ", error);
        }
    };

    // tell the server an object has been created
    // an actual state update is made when the socket receives
    // new robot message
    logCreation = async (newObj) => {
        if (!newObj) {return}
        try {
            await axios.post(`${urls.baseURL}`, {
                humanName: newObj.humanName,
                color: newObj.color,
                position: newObj.position,
            });
        } catch (error) {
            console.log("Error with creating object: ", error);
        }
    };

    // creates or selects a robot when
    // the user clicks on the plane
    handlePlaneClick(position) {

        if (this.state.selectedObjectID) { // if something is selected it will deselect it
            this.setState({
                selectedObjectID: "",
                humanName: "",
                color: "",
                rating: 0,
            });
        } else if (this.state.clickToAdd) { // changed by the ConfigForm component

            // creates some default parameters of new object and sends
            // a request to the sever to create it via logCreation
            const addedObject = {
                humanName: humanNames.allRandomEn(),
                position: position,
                color: "white",
            };

            this.logCreation(addedObject);
        }
    }

    // tells the server to delete the selected robot
    async deleteObject() {
        if (!this.state.selectedObjectID) {return}

        try {
            await axios.delete(
                `${urls.baseURL}\\${this.state.selectedObjectID}`
            );
        } catch (error) {
            console.log("Error with deleting object: ", error);
        }
    }

    // tells the server to update the selected robot
    // if its a position change logPositionChange will send it
    async updateObject(prop) {
        if (!prop.key) {return}

        try {
            await axios.put(`${urls.baseURL}\\${prop.key}`, {
                humanName: prop.humanName,
                color: prop.color,
                rating: prop.rating,
            });
        } catch (error) {
            console.log("Error with editing object: ", error);
        }
    }

    // used by form to update human name of selected object
    changeHumanName = (newName) => {
        this.updateObject({ key: this.state.selectedObjectID, humanName: newName });
    };

    // used by form to update color of selected object
    changeColor = (newColor) => {
        this.updateObject({ key: this.state.selectedObjectID, color: newColor });
    };

    // used by form to update rating or speed of selected object
    changeRating = (newRating) => {
        this.updateObject({ key: this.state.selectedObjectID, rating: newRating });
    };

    // used by form to update the add mode (clicks on plane make new objects)
    changeAddMode = (addMode) => {
        this.setState({ clickToAdd: addMode });
    };

    render() {
        return (
            <>
                <LoadingScreen
                    loading={this.state.loading}
                    bgColor="#f1f1f1"
                    spinnerColor="#9ee5f8"
                    textColor="#676767"
                    logoSrc="/logo512.png"
                    text=""
                >
                    |
                </LoadingScreen>

                <Canvas
                    camera={{ fov: 45, position: [0, -70, 30] }}
                    onCreated={({ gl }) => {
                        gl.setPixelRatio(window.devicePixelRatio || 2);
                        gl.shadowMap.enabled = true;
                        gl.shadowMap.type = THREE.PCFSoftShadowMap;
                    }}
                >
                    {isBrowser && (
                        <CameraControls selectedSomething={this.state.selectedObjectID !== ""} />
                    )}

                    <Index
                        selectedObjectID={this.state.selectedObjectID}
                        objects={this.state.objects}
                        logPositionChange={this.logPositionChange.bind(this)}
                        logSelection={this.logSelection.bind(this)}
                        handlePlaneClick={this.handlePlaneClick.bind(this)}
                    />
                </Canvas>

                <ConfigForm
                    name={this.state.selectedObjectID}
                    humanName={this.state.humanName}
                    changeHumanName={this.changeHumanName.bind(this)}
                    color={this.state.color}
                    changeColor={this.changeColor.bind(this)}
                    rating={this.state.rating}
                    changeRating={this.changeRating.bind(this)}
                    deleteObject={this.deleteObject.bind(this)}
                    changeAddMode={this.changeAddMode.bind(this)}
                    clickToAdd={this.state.clickToAdd}
                />

                <ToastContainer
                    position={(isBrowser && "top-right") || "bottom-left"}
                    autoClose={2000}
                    hideProgressBar={true}
                    newestOnTop={false}
                    closeOnClick
                    rtl={false}
                    pauseOnFocusLoss={false}
                    draggable
                    pauseOnHover
                />
            </>
        );
    }
}

if (module.hot) {module.hot.accept();}

ReactDOM.render(<App />, document.getElementById("root"));

// enable service work to make the app a PWA
serviceWorkerRegistration.register();