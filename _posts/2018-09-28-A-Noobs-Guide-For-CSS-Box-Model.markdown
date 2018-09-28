# A Noob's Guide For CSS Box-Model
Every HTML element we create appears to always just stack on each other. HTML elements are just boxes with different names for semantic purposes. Every HTML element starts as a generic rectangular box before CSS modifies its properties. Before we get into these properties lets get back into the whole stacking into the top of each other thing. All Elements has a display property & our Web has been Automatically assigned each element as default value without us knowing.

Many Element we see Generally has a Display: Block Value which means the element Render on a new line (and you can specify the width & height). the default value of each element is Inline the element only occupy as much space as it needed & other inline elements are free to sit alongside in the same line. All text is an Inline element (as you type is continuously on the same line until you wrap your text in parent paragraph tag which browser render as a block. there is also inline-block which is like inline-block but you can set up its height & width like Block elements.
Now the thing is as I said every element default is inline but their arent too many inline elements everything we see stack on each other which means they are Block. WELL, our Web Browser actually loads a default stylesheet on every website we visit which override default value making most element block. here link to Stylesheet that WebKit use(the engine used by Chrome). [Webkit User Agent StyleSheet](https://trac.webkit.org/browser/trunk/Source/WebCore/css/html.css?rev=82180). every Browser has its own Default CSS stylesheet.
we can see the invisible box of Box Model if we give them color. but that's not whole part there is more to box model explain the sizing of an element based on its CSS properties of our box the box is actually made of few layers the Content, Padding, Border, and Margin.
Content - The content of the box, where text and images appear
Padding - Clears an area around the content. The padding is transparent
Border - A border that goes around the padding and content
Margin - Clears an area outside the border. The margin is transparent

Box-Modelnow if we have 2 elements on top of each other lets say with padding 50px then there is total off 100px between 2 elements(50px+50px). so if we Replace margin with Padding margin won't double-up else the top margin(A) overlap margin of B element make total margin between only 50px.
Default, when we set width to element width, is applied to the content area and any padding border margin is applied outside of the content box and all its value add up to total width/height.
let consider 2 Boxes with width 50%. if we add Padding to it the total width will exceed 100% and it will mess up the layout and this is why we need Box-Sizing properties.
There are 3 Major type of Box-Sizing Properties
Content -Box - This is the initial and default value as specified by the CSS standard. The widthand height properties include the content but does not include the padding, border, or margin. For example, .box {width: 350px; border: 10px solid black;} renders a box that is 370px wide.
Padding-Box - The width and height properties include the content and padding but do not include the border and margin. Note that padding will be inside of the box. For example, .box {width: 350px; padding: 10px ;}renders a box that is 350px wide. The content box can't be negative and is floored to 0,
Border -Box - The width and height properties include the content, padding, and border, but do not include the margin. Note that padding and border will be inside of the box. For example, .box {width: 350px; border: 10px solid black;}renders a box that is 350px wide. The content box can't be negative and is floored to 0, making it impossible to use border-box to make the element disappear.

Generally, only Content-Box and Border-Box are used that's why Most of the Browsers Don't even support Padding-Box


source:css-tricks.comThe red line between the images represents the elements' width value. Notice that the element with the default box-sizing: content-box; exceeds the declared width when the padding and border are added to the outside of the content box, while the element with appliedbox-sizing: border-box; fits completely within the declared width.


Although Context-Box is the Default property but the CSS hero is Border-Box.The box-sizing: Border-box property will modify box model & move applied padding and border value inside the Content box making sure the width you set is the width you get there is no math to calculate the actual width like in content or padding box. Border box is always the way to go in my opinion but as the content box is default you can add this CSS code to convert all box-sizing to border-box.