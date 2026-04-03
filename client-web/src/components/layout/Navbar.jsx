import React from "react";
import "./Navbar.css";
import AirMS_web from "../../assets/AirMS_web.png";

const Navbar = () => {
  return (
    <nav className="navbar">
      <img src={AirMS_web} alt="Logo" className="logo" />
    </nav>
  );
};

export default Navbar;
