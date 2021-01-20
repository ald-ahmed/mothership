import {extend, useThree} from "react-three-fiber";
import React, {useRef} from "react";
import Switch from "react-switch";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls";
extend({ OrbitControls });

export function CameraControls(props) {
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

export function ConfigForm(props) {
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
