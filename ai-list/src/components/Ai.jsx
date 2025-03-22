export default function Ai({ name, logo, link }) {
  return (
    <div className="p-3 border-1 rounded-lg border-gray-200 shadow-white bg-[#e6e6e6]">
      <div>
        <h2 className="text-xl font-medium">{name}</h2>
        <img src={logo} alt="Ai" className="w-20 my-2" />
        <button
          className="bg-blue-600 hover:bg-blue-900 text-white font-bold py-2 px-4 rounded w-full cursor-pointer"
          onClick={() => {
            window.open(link || "https://chat.openai.com/", "_blank");
          }}
        >
          Visit
        </button>
      </div>
    </div>
  );
}
