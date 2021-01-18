import ReactDOM from "react-dom"
import * as CANNON from "cannon";
import React, {Component, useRef, useState, useEffect} from "react"
import {Canvas, extend, useFrame, useThree, useLoader} from "react-three-fiber"
import {useDrag} from "react-use-gesture";
import * as THREE from 'three';
import {Provider, useCannon} from './useCannon';
import useEventListener from '@use-it/event-listener';
import {Html} from "@react-three/drei"
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls";
import "./index.css"
import URLs from "./urls.js";
import io from "socket.io-client";
import axios from "axios";
import {toast, ToastContainer} from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

let humanNames = require('human-names');

// import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";

extend({ OrbitControls });

let initX;
let initY;

function DraggableDodecahedron({ identity: identity, logPositionChange: logPositionChange, active: active, logSelection: logSelection}) {


    const { camera, mouse } = useThree();

    const [position, setPosition] = useState(identity.position);
    const [key, _] = useState(identity.id);

    const [hovered, setHover] = useState(false)

    const [quaternion, setQuaternion] = useState([0, 0, 0, 0]);

    const { ref, body } = useCannon({ bodyProps: { mass: 5 } }, body => {
        body.addShape(new CANNON.Box(new CANNON.Vec3(1, 1, 1)))
        body.position.set(...[position.x, position.y, position.z]);

    }, []);
    const bind = useDrag(({ event, offset: [,], xy: [x, y], first, last }) => {

        const pos = get3DPosition({ screenX: mouse.x, screenY: mouse.y, camera });
        const positionHasChanged = Math.abs(pos.x-initX) > 0.05 && Math.abs(pos.y-initY) > 0.05

        if (first) {

            body.mass = 0;
            body.updateMassProperties();
            initX = pos.x
            initY = pos.y

        } else if (last) {

            body.mass = 5;
            body.updateMassProperties();

            if (positionHasChanged) {
                logPositionChange(key, body.position)
            }
            else {
                logSelection(key, identity)
            }

        }

        if (!first && positionHasChanged) {
            body.position.set(pos.x, pos.y, -0.7);
        }

    }, { pointerEvents: true });


    useFrame(() => {
        // Sync cannon body position with three js
        const deltaX = Math.abs(body.position.x - position.x);
        const deltaY = Math.abs(body.position.y - position.y);
        const deltaZ = Math.abs(body.position.z - position.z);
        if (deltaX > 0.001 || deltaY > 0.001 || deltaZ > 0.001) {
            setPosition(body.position.clone());
        }
        const bodyQuaternion = body.quaternion.toArray();
        const quaternionDelta = bodyQuaternion.map((n, idx) => Math.abs(n - quaternion[idx]))
            .reduce((acc, curr) => acc + curr);
        if (quaternionDelta > 0.01) {
            setQuaternion(body.quaternion.toArray());
        }
    });

    return (

        <mesh onPointerOver={(e) => setHover(true)}
              onPointerOut={(e) => setHover(false)}
              ref={ref}
              castShadow={true}
              color={hovered ? 'blue' : identity.color}
              receiveShadow={false}
              position={[position.x, position.y, position.z]}
              quaternion={quaternion} {...bind()}  onClick={e => {e.stopPropagation();}}>

            <dodecahedronBufferGeometry attach="geometry" />
            <meshLambertMaterial attach="material"  color={active ? 'blue' : identity.color}  />

            <Html scaleFactor={50}>
                <div class="content">
                    {identity.humanName}
                </div>
            </Html>

        </mesh>

    )
}

function Plane({ position, onPlaneClick }) {

    const { ref } = useCannon({ bodyProps: { mass: 0 } }, body => {
        body.addShape(new CANNON.Plane())
        body.position.set(...position)
    })
    return (
        <mesh ref={ref} receiveShadow position={position}
              onClick={onPlaneClick}>
            <planeBufferGeometry attach="geometry" args={[100, 100]} />
            <meshPhongMaterial attach="material" color="indianred"/>
        </mesh>
    )

}


const get3DPosition = ({ screenX, screenY, camera }) => {
    var vector = new THREE.Vector3(screenX, screenY, 0.5);
    vector.unproject(camera);
    var dir = vector.sub(camera.position).normalize();
    var distance = - camera.position.z / dir.z;
    return camera.position.clone().add(dir.multiplyScalar(distance));
};

const keyPressed = {
};


const ConfigForm = ({ humanName, changeHumanName, name, color, changeColor, rating, changeRating, deleteObject}) => {

    const onSubmit = data => console.log(data);

    return (

        <form onSubmit={onSubmit}>

            <input type="text" placeholder="Human Name" name="Human Name"  value={humanName || ''} onChange={e => changeHumanName(e.target.value)} />
            <br/>
            <input readOnly type="text" placeholder="Object Key" name="Object Key"  value={name || ''}/>
            <br/>

            <select name="Color" value={color || ''} onChange={e => changeColor(e.target.value)}>
                <option value="white">White</option>
                <option value="hotpink">Pink</option>
                <option value="lightgreen">Green</option>
            </select>

            <br/>

            <input type="range" placeholder="Rating" name="Rating"  value={rating || ''} onChange={e => changeRating(e.target.value)} />

            <br/>

            <button  type="button" onClick={deleteObject}>
                Delete
            </button>

            {/*<input type="submit" />*/}
        </form>

    );
}




function Index(props) {

    const { mouse, camera } = useThree();


    const onPlaneClick = (e) => {

        const position = get3DPosition({ screenX: mouse.x, screenY: mouse.y, camera });

        const addedObject = {
            key: 10*Math.random()+"",
            position: position,
            humanName: humanNames.allRandomEn(),
            color: "white"
        }

        // props.addObject(addedObject);

        props.logCreation(addedObject);

    };


    // const handleKeyDown = (e) => {
    //     if (!keyPressed[e.key]) {
    //         keyPressed[e.key] = new Date().getTime();
    //     }
    // };
    //
    // const handleKeyUp = (e) => {
    //     delete keyPressed[e.key];
    // };

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

    // useEventListener('keydown', handleKeyDown);
    // useEventListener('keyup', handleKeyUp);

    useEventListener('wheel', mouseWheel);


    // useFrame((_, delta) => {
    //     // move camera according to key pressed
    //     Object.entries(keyPressed).forEach((e) => {
    //         const [key, start] = e;
    //         const duration = new Date().getTime() - start;
    //
    //         // increase momentum if key pressed longer
    //         let momentum = Math.sqrt(duration + 200) * 0.01 + 0.05;
    //
    //         // adjust for actual time passed
    //         momentum = momentum * delta / 0.016;
    //
    //         // increase momentum if camera higher
    //         momentum = momentum + camera.position.z * 0.02;
    //
    //         switch (key) {
    //             case 'w': camera.translateY(momentum); break;
    //             case 's': camera.translateY(-momentum); break;
    //             case 'd': camera.translateX(momentum); break;
    //             case 'a': camera.translateX(-momentum); break;
    //             default:
    //         }
    //     });
    // });



    const CameraControls = () => {
        // Get a reference to the Three.js Camera, and the canvas html element.
        // We need these to setup the OrbitControls component.
        // https://threejs.org/docs/#examples/en/controls/OrbitControls
        const {
            camera,
            gl: { domElement },
        } = useThree();
        // Ref to the controls, so that we can update them on every frame using useFrame
        const controls = useRef();
        useFrame((state) => controls.current.update());
        // console.log(camera.position)
        return <orbitControls ref={controls} args={[camera, domElement]} />;
    };

    return <React.Fragment >

        {/*<CameraControls />*/}

        <ambientLight  intensity={0.75} />
        <spotLight  castShadow={true} intensity={0.8} position={[0, -50, 200]} angle={Math.PI / 15} penumbra={1} />

        <Provider>

            {props.objects.map((t) => (
                <DraggableDodecahedron  key={t.id}
                                        identity={t}
                                        active={t.id === props.chosen}
                                        logPositionChange={props.logPositionChange}
                                        logSelection={props.logSelection}  />
            ))}

            <Plane position={[0, 0, -5]} onPlaneClick={onPlaneClick} />

        </Provider>

    </React.Fragment>

};


function unboxAPIConfigObject(objData){

    if (objData._id && objData.humanName && objData.position && objData.color){
        return {
            id: objData._id,
            position: objData.position,
            humanName: objData.humanName,
            color: objData.color
        }
    }
    else {
        return;
    }

}


//socket.io connection
const socket = io(`${URLs.socketURL}`);


class App extends Component {

    constructor(props) {
        super(props);

        this.state = {
            objects: [],
            chosen: 0,
            humanName: "",
            color: "",
            rating: 0,
        };

    }


    async fetchObjects() {


        console.log("Fetching objects")

        try {
            const response = await axios.get(
                `${URLs.baseURL}`,
            );

            if (response.status === 200) {
                // console.log(response.data);

                var objects = response.data.map((t) => (
                    unboxAPIConfigObject(t)
                ))

                objects = objects.filter(function (el) {
                    return el != null;
                });

                // console.log("Fetched objects", objects)

                this.setState(({
                    objects: objects,
                }));

                // toast.dark('Loaded All Objects');

            } else {
                alert(response.data.message);
            }
        } catch (error) {
            console.log("Error with fetching: ", error);
            alert(
                "Error with fetching. Please check the console for more info."
            );
        }

    }

    componentDidMount = async () => {

        // const realtimeUpdate = {
        //     type: change.operationType,
        //     id: change.documentKey._id,
        //     document: null,
        //     updatedFields: null,
        // }

        await this.fetchObjects();

        socket.on("newRobot", (realtimeUpdate) => {

            console.log("got new robot from server", realtimeUpdate)

            const objData = realtimeUpdate.document

            const newObj = {
                id: objData._id,
                position: objData.position,
                humanName: objData.humanName,
                color: objData.color
            }

            toast.dark('Created '+newObj.humanName);

            this.setState(state => ({
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

            const item = objects.splice(index, 1)[0]

            this.setState({ objects: objects }, function() {

                if (item.id === this.state.chosen) {

                    this.setState({
                        chosen: "",
                        humanName: "",
                        color: "",
                        rating: 0
                    });

                }

                toast.warn('Deleted '+item.humanName);

            });


        });

        socket.on("modifiedRobot", (realtimeUpdate) => {

            let objects = [...this.state.objects];
            let index = 0;

            let _ = objects.find((o, i) => {
                if (o.id === realtimeUpdate.id) {

                    let item = {...objects[i]};
                    // console.log("before ", objects[i])
                    item = {...item, ...realtimeUpdate.updatedFields}
                    objects[i] = item;
                    index = i;
                    return true; // stop searching
                }
            });

            const item = objects.splice(index, 1)[0]

            this.setState({ objects: objects }, function() {

                if (item.id === this.state.chosen) {

                    this.setState({
                        objects: [...objects, item],
                        chosen: item.id,
                        humanName: item.humanName,
                        color: item.color,
                        rating: item.rating
                    }, function (){
                        toast.dark('Modified '+item.humanName);
                    });

                }

                else {
                    this.setState({objects: [...objects, item]}, function (){
                        toast.dark('Modified '+item.humanName);
                    });
                }

            });

        });

    };




    logSelection =  (key, identity) => {
        console.log(key, "now selected")

        this.setState(({
            chosen: key,
            humanName: identity.humanName,
            color: identity.color,
            rating: identity.rating
        }));

    }




    logPositionChange = async (key, position) => {
        console.log(key, "changed", position)

        try {
            const response = await axios.put(
                `${URLs.baseURL}\\${key}`,
                {
                    position: position
                }
            );

            if (response.data.success) {
                // alert("created", response.data);
            } else {
                // alert(response.data.message);
            }
        } catch (error) {
            console.log("Error with adding thought: ", error);
            alert(
                "Error with adding thought. Please check the console for more info."
            );
        }

    }


    logCreation = async (newObj) => {

        try {
            const response = await axios.post(
                `${URLs.baseURL}`,
                {
                    humanName: newObj.humanName,
                    color: newObj.color,
                    position: newObj.position,
                }
            );

            if (response.data.success) {
                // alert("created", response.data);
            } else {
                // alert(response.data.message);
            }
        } catch (error) {
            console.log("Error with adding thought: ", error);
            alert(
                "Error with adding thought. Please check the console for more info."
            );
        }

    }


    async deleteObject() {

        try {

            const response = await axios.delete(
                `${URLs.baseURL}\\${this.state.chosen}`
            );

            if (response.data.success) {
                // alert("created", response.data);
            } else {
                // alert(response.data.message);
            }

        } catch (error) {
            console.log("Error with adding thought: ", error);
            // alert("Error with adding thought. Please check the console for more info.");
        }

    }

    async updateObject(prop) {

        try {
            const response = await axios.put(
                `${URLs.baseURL}\\${prop.key}`,
                {
                    humanName: prop.humanName,
                    color: prop.color,
                    rating: prop.rating,
                }
            );

            if (response.data.success) {
                // alert("created", response.data);
            } else {
                // alert(response.data.message);
            }

        } catch (error) {
            console.log("Error with adding thought: ", error);
            // alert("Error with adding thought. Please check the console for more info.");
        }

    }

    changeHumanName = (newName) => {
        this.updateObject({key: this.state.chosen, humanName: newName })
    }

    changeColor = (newColor) => {
        this.updateObject({key: this.state.chosen, color: newColor })
    }

    changeRating = (newRating) => {
        this.updateObject({key: this.state.chosen, rating: newRating })
    }




    render() {
        return (
            <>

                <Canvas camera={{fov: 45, position:[0, -70, 30]}}
                        onCreated={({ gl }) => {
                            gl.setPixelRatio(window.devicePixelRatio || 2)
                            gl.shadowMap.enabled = true;
                            gl.shadowMap.type = THREE.PCFSoftShadowMap;
                        }}>

                    <Index chosen={this.state.chosen}
                           objects={this.state.objects}
                           logPositionChange={this.logPositionChange.bind(this)}
                           logSelection={this.logSelection.bind(this)}
                           logCreation={this.logCreation.bind(this)}
                    />

                </Canvas>


                <ConfigForm name={this.state.chosen}
                            humanName={this.state.humanName}
                            changeHumanName={this.changeHumanName.bind(this)}
                            color={this.state.color}
                            changeColor={this.changeColor.bind(this)}
                            rating={this.state.rating}
                            changeRating={this.changeRating.bind(this)}
                            deleteObject={this.deleteObject.bind(this)}
                />

                <ToastContainer
                    position="top-right"
                    autoClose={2000}
                    hideProgressBar={false}
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
    module.hot.accept()
}

ReactDOM.render(
    <App />,
    document.getElementById("root")
)

