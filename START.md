I have several questions and want to frame them appropriately, but also need help figuring out the best way to ask you so I will have the most productive outcome.          

* I want to build an application that can be used on a phone or tablet, is web based, supports gestural control interaction with the screen, as well as available sensors
* This application should render shapes on a 3d plane, and initially allow a front camera angle only
* The 3d plane itself should allow for color hue and intensity, as well as luminance brightness and contrast
* There are five shapes: a sin wave, a tan wave, a circle, a polygon, perlin noise, and a webcam image. They are controllable in the following ways:
    * tiling out to infinity on the x and y axes
    * increasing/decreasing frequency on those axes tiling
    * movement along one axis (not z)
    * rotation along the axis of movement
    * z axis recursion fore and aft
    * amount (depth) of recursion
    * multiaxis movement of recursion
    * rotation of recursion
    * color hue and intensity
    * luminance brightness and contrast
    * radial and kaleidoscopic mirroring around a central point
    * transparency
* There should be N (1-4) number of these shapes, each independently controllable.
* Shapes can interact with the other shapes as follows:
    * layering order
    * influencing, mixing in other shapes
* Circle should have an additional element of control of its diameter along its two axes independently or simultaneously
* Polygon should have the ability to change the number of sides between 3 and 12
* Perlin noise should have adjustable frequency and blur for more broad or granular resolution
* All interactions should be automatable as in cycling along an LFO, but not start in an automated fashion