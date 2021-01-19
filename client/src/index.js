import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import * as serviceWorkerRegistration from "./serviceWorkerRegistration";
import { Canvas, extend, useFrame, useThree } from "react-three-fiber";
import React, { Component, useRef, useState } from "react";
import { toast, ToastContainer } from "react-toastify";
import useEventListener from "@use-it/event-listener";
import { Provider, useCannon } from "./useCannon";
import LoadingScreen from "react-loading-screen";
import { isBrowser } from "react-device-detect";
import "react-toastify/dist/ReactToastify.css";
import { useDrag } from "react-use-gesture";
import { Html } from "@react-three/drei";
import io from "socket.io-client";
import Switch from "react-switch";
import ReactDOM from "react-dom";
import * as CANNON from "cannon";
import * as THREE from "three";
import urls from "./urls.js";
import axios from "axios";
import "./index.css";

let humanNames = require("human-names");
extend({ OrbitControls });

//socket.io connection
const socket = io(`${urls.socketURL}`);

let initX;
let initY;

function DraggableDodecahedron(props) {
    const { camera, mouse } = useThree();

    const [position, setPosition] = useState(props.identity.position);
    const [key, _] = useState(props.identity.id);

    const [hovered, setHover] = useState(false);

    const [quaternion, setQuaternion] = useState([0, 0, 0, 0]);

    const { ref, body } = useCannon(
        { bodyProps: { mass: 5 } },
        (body) => {
            body.addShape(new CANNON.Box(new CANNON.Vec3(1, 1, 1)));
            body.position.set(...[position.x, position.y, position.z]);
        },
        []
    );

    const bind = useDrag(
        ({ event, offset: [,], xy: [x, y], first, last }) => {
            const pos = get3DPosition({ screenX: mouse.x, screenY: mouse.y, camera });
            const positionHasChanged =
                Math.abs(pos.x - initX) > 0.05 && Math.abs(pos.y - initY) > 0.05;

            if (first) {
                body.mass = 0;
                body.updateMassProperties();
                initX = pos.x;
                initY = pos.y;
            } else if (last) {
                body.mass = 5;
                body.updateMassProperties();

                if (positionHasChanged) {
                    props.logPositionChange(key, body.position);
                } else {
                    props.logSelection(key, props.identity);
                }
            }

            if (!first && positionHasChanged) {
                body.position.set(pos.x, pos.y, -0.7);
            }
        },
        { pointerEvents: true }
    );

    useFrame(() => {
        // Sync cannon body position with three js
        const deltaX = Math.abs(body.position.x - position.x);
        const deltaY = Math.abs(body.position.y - position.y);
        const deltaZ = Math.abs(body.position.z - position.z);
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
    // {/*rgb(75,110,222)*/}

    return (
        <mesh
            onPointerOver={(e) => setHover(true)}
            onPointerOut={(e) => setHover(false)}
            ref={ref}
            castShadow={true}
            receiveShadow={false}
            position={[position.x, position.y, position.z]}
            quaternion={quaternion}
            {...bind()}
            onClick={(e) => {
                e.stopPropagation();
            }}
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
function Plane(props) {
    const { ref } = useCannon({ bodyProps: { mass: 0 } }, (body) => {
        body.addShape(new CANNON.Plane());
        body.position.set(...props.position);
    });
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
function ConfigForm(props) {
    const onSubmit = (data) => console.log(data);

    return (
        <form onSubmit={onSubmit}>
            <label>
                <span>Tap to Add Mode</span>
                <Switch
                    onColor={"#2b6dea"}
                    offColor={"#bcbcbc"}
                    onChange={(checked) => props.changeAddMode(checked)}
                    checked={props.clickToAdd}
                />
            </label>
            <br />

            <label>
                <span>Human Name</span>
                <input
                    type="text"
                    placeholder="Human Name"
                    name="Human Name"
                    value={props.humanName || ""}
                    onChange={(e) => props.changeHumanName(e.target.value)}
                />
            </label>
            <br />

            <label>
                <span>Key</span>
                <input
                    readOnly
                    type="text"
                    placeholder="Object Key"
                    name="Object Key"
                    value={props.name || ""}
                />
            </label>
            <br />

            <label>
                <span>Color</span>

                <select
                    name="Color"
                    value={props.color || ""}
                    onChange={(e) => props.changeColor(e.target.value)}
                >
                    <option value="white">White</option>
                    <option value="#3C3C3C">Black</option>
                    <option value="#D7263D">Red</option>
                    <option value="#F5D547">Yellow</option>
                </select>
            </label>
            <br />
            <label>
                <span>Speed</span>

                <input
                    type="range"
                    placeholder="Rating"
                    name="Rating"
                    value={props.rating || ""}
                    onChange={(e) => props.changeRating(e.target.value)}
                />
            </label>
            <br />

            <label>
                <span>Delete</span>

                <button type="button" onClick={props.deleteObject}>
                    Delete
                </button>
            </label>
        </form>
    );
}
function Index(props) {
    const { mouse, camera } = useThree();

    const onPlaneClick = (e) => {
        const position = get3DPosition({
            screenX: mouse.x,
            screenY: mouse.y,
            camera,
        });
        props.handlePlaneClick(position);
    };

    const mouseWheel = (e) => {
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

    useEventListener("wheel", mouseWheel);

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
                    <DraggableDodecahedron
                        key={t.id}
                        identity={t}
                        active={t.id === props.chosen}
                        logPositionChange={props.logPositionChange}
                        logSelection={props.logSelection}
                    />
                ))}

                <Plane position={[0, 0, -5]} onPlaneClick={onPlaneClick} />
            </Provider>
        </React.Fragment>
    );
}
function CameraControls(props) {
    const {
        camera,
        gl: { domElement },
    } = useThree();

    const controls = useRef();

    return (
        <orbitControls
            ref={controls}
            enabled={!props.selectedSomething}
            enablePan={false}
            minAzimuthAngle={0}
            maxAzimuthAngle={0}
            minPolarAngle={Math.PI / 2}
            maxPolarAngle={(Math.PI * 9.5) / 10}
            minDistance={50}
            maxDistance={100}
            args={[camera, domElement]}
        />
    );
}

const unboxAPIConfigObject = (objData) => {
    if (objData._id && objData.humanName && objData.position && objData.color) {
        return {
            id: objData._id,
            position: objData.position,
            humanName: objData.humanName,
            color: objData.color,
        };
    }
    return {};
};
const get3DPosition = ({ screenX, screenY, camera }) => {
    var vector = new THREE.Vector3(screenX, screenY, 0.5);
    vector.unproject(camera);
    var dir = vector.sub(camera.position).normalize();
    var distance = -camera.position.z / dir.z;
    return camera.position.clone().add(dir.multiplyScalar(distance));
};

class App extends Component {
    constructor(props) {
        super(props);

        this.state = {
            objects: [],
            chosen: "",
            humanName: "",
            color: "",
            rating: 0,
            clickToAdd: true,
            loading: true,
        };
    }

    async fetchObjects() {
        console.log("Fetching objects");

        try {
            const response = await axios.get(`${urls.baseURL}`);

            if (response.status === 200) {
                // console.log(response.data);

                let objects = response.data.map((t) => unboxAPIConfigObject(t));

                objects = objects.filter(function (el) {
                    return el.id != null;
                });

                this.setState({
                    objects: objects,
                    loading: false,
                });
            } else {
                alert(response.data.message);
            }
        } catch (error) {
            console.log("Error with fetching: ", error);
        }
    }

    componentDidMount = async () => {
        socket.on("connect", () => {
            console.log("got connection");

            this.fetchObjects();

            socket.on("disconnect", () => {
                console.log("lost connection");
                this.setState({ loading: true });
            });
        });

        socket.on("newRobot", (realtimeUpdate) => {
            console.log("got new robot from server", realtimeUpdate);

            const objData = realtimeUpdate.document;

            const newObj = {
                id: objData._id,
                position: objData.position,
                humanName: objData.humanName,
                color: objData.color,
            };

            toast.dark("Created " + newObj.humanName);

            this.setState((state) => ({
                objects: [...state.objects, newObj],
            }));
        });

        socket.on("deletedRobot", (realtimeUpdate) => {
            let objects = [...this.state.objects];
            let index = 0;

            let _ = objects.find((o, i) => {
                if (o.id === realtimeUpdate.id) {
                    index = i;
                    return true; // stop searching
                }
            });

            const item = objects.splice(index, 1)[0];

            this.setState({ objects: objects }, function () {
                if (item.id === this.state.chosen) {
                    this.setState({
                        chosen: "",
                        humanName: "",
                        color: "",
                        rating: 0,
                    });
                }

                toast.error("Deleted " + item.humanName);
            });
        });

        socket.on("modifiedRobot", (realtimeUpdate) => {
            let objects = [...this.state.objects];
            let index = 0;

            let _ = objects.find((o, i) => {
                if (o.id === realtimeUpdate.id) {
                    let item = { ...objects[i] };
                    item = { ...item, ...realtimeUpdate.updatedFields };
                    objects[i] = item;
                    index = i;
                    return true; // stop searching
                }
            });

            const item = objects.splice(index, 1)[0];

            this.setState({ objects: objects }, function () {
                if (item.id === this.state.chosen) {
                    this.setState(
                        {
                            objects: [...objects, item],
                            chosen: item.id,
                            humanName: item.humanName,
                            color: item.color,
                            rating: item.rating,
                        },
                        function () {
                            toast.warn("Modified " + item.humanName);
                        }
                    );
                } else {
                    this.setState({ objects: [...objects, item] }, function () {
                        toast.warn("Modified " + item.humanName);
                    });
                }
            });
        });
    };

    logSelection = (key, identity) => {
        console.log(key, "now selected");

        this.setState({
            chosen: key,
            humanName: identity.humanName,
            color: identity.color,
            rating: identity.rating,
        });
    };

    logPositionChange = async (key, position) => {
        console.log(key, "changed", position);
        if (!key || !position) {
            return;
        }
        try {
            const response = await axios.put(`${urls.baseURL}\\${key}`, {
                position: position,
            });
        } catch (error) {
            console.log("Error with changing location: ", error);
        }
    };

    logCreation = async (newObj) => {
        if (!newObj) {
            return;
        }

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

    handlePlaneClick(position) {
        if (this.state.chosen) {
            this.setState({
                chosen: "",
                humanName: "",
                color: "",
                rating: 0,
            });
        } else if (this.state.clickToAdd) {
            const addedObject = {
                humanName: humanNames.allRandomEn(),
                position: position,
                color: "white",
            };

            this.logCreation(addedObject);
        }
    }

    async deleteObject() {
        if (!this.state.chosen) {
            return;
        }

        try {
            const response = await axios.delete(
                `${urls.baseURL}\\${this.state.chosen}`
            );
        } catch (error) {
            console.log("Error with deleting object: ", error);
        }
    }

    async updateObject(prop) {
        if (!prop.key) {
            return;
        }

        try {
            const response = await axios.put(`${urls.baseURL}\\${prop.key}`, {
                humanName: prop.humanName,
                color: prop.color,
                rating: prop.rating,
            });
        } catch (error) {
            console.log("Error with editing object: ", error);
        }
    }

    changeHumanName = (newName) => {
        this.updateObject({ key: this.state.chosen, humanName: newName });
    };

    changeColor = (newColor) => {
        this.updateObject({ key: this.state.chosen, color: newColor });
    };

    changeRating = (newRating) => {
        this.updateObject({ key: this.state.chosen, rating: newRating });
    };

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
                    Loaded
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
                        <CameraControls selectedSomething={this.state.chosen !== ""} />
                    )}

                    <Index
                        chosen={this.state.chosen}
                        objects={this.state.objects}
                        logPositionChange={this.logPositionChange.bind(this)}
                        logSelection={this.logSelection.bind(this)}
                        handlePlaneClick={this.handlePlaneClick.bind(this)}
                    />
                </Canvas>

                <ConfigForm
                    name={this.state.chosen}
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

if (module.hot) {
    module.hot.accept();
}
ReactDOM.render(<App />, document.getElementById("root"));

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://cra.link/PWA
serviceWorkerRegistration.register();
